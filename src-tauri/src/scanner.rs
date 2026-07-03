use ignore::WalkBuilder;
use serde::Serialize;
use std::collections::HashSet;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc, Mutex,
};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use tauri_plugin_dialog::DialogExt;

const POLICY_ID: &str = "custom-directory-metadata-scan-mvp";
const MAX_DEPTH: usize = 6;
const MAX_ENTRIES: usize = 2_000;
const MAX_FILE_SIZE_BYTES: u64 = 10 * 1024 * 1024;
const REDACTED_SEGMENT: &str = "[sensitive]";

#[derive(Default)]
pub struct ScanState {
    selected_root: Mutex<Option<SelectedRoot>>,
}

#[derive(Clone, Debug)]
struct SelectedRoot {
    selection_id: String,
    canonical_root: PathBuf,
    display_name: String,
    root_summary: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanCommandError {
    code: &'static str,
    message: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannerPolicy {
    policy_id: &'static str,
    metadata_only: bool,
    content_reading_enabled: bool,
    execution_enabled: bool,
    full_disk_scan_enabled: bool,
    follow_symlinks: bool,
    respects_ignore_files: bool,
    max_depth: usize,
    max_entries: usize,
    max_file_size_bytes: u64,
    blocked_root_examples: Vec<&'static str>,
    excluded_names: Vec<&'static str>,
    resource_kinds: Vec<&'static str>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedScanDirectory {
    selection_id: String,
    display_name: String,
    root_summary: String,
    policy_decision: &'static str,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomScanResult {
    policy_id: &'static str,
    root_display_name: String,
    root_summary: String,
    scanned_at_ms: u64,
    counts: ScanCounts,
    resources: Vec<ScanResource>,
    warnings: Vec<ScanWarning>,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanCounts {
    visited_entries: usize,
    returned_resources: usize,
    skipped_by_exclude: usize,
    skipped_by_size: usize,
    skipped_symlinks: usize,
    denied_errors: usize,
    truncated: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResource {
    id: String,
    relative_path: String,
    entry_type: &'static str,
    extension: Option<String>,
    size_bytes: Option<u64>,
    modified_at_ms: Option<u64>,
    resource_kind: &'static str,
    risk_labels: Vec<&'static str>,
    boundary_labels: Vec<&'static str>,
    classification_reason: &'static str,
    sensitive: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanWarning {
    code: &'static str,
    message: String,
    relative_path: Option<String>,
}

#[derive(Debug)]
pub struct ValidatedRoot {
    canonical_root: PathBuf,
    display_name: String,
    root_summary: String,
}

#[derive(Debug)]
enum ScanError {
    InvalidPath(String),
    RejectedRoot(String),
    Permission(String),
    SelectionMissing,
}

#[tauri::command]
pub async fn pick_scan_directory(
    app: tauri::AppHandle,
    state: State<'_, ScanState>,
) -> Result<Option<SelectedScanDirectory>, ScanCommandError> {
    let Some(selected) = app
        .dialog()
        .file()
        .set_title("选择要扫描的目录")
        .set_can_create_directories(false)
        .blocking_pick_folder()
    else {
        return Ok(None);
    };

    let selected_path = selected.into_path().map_err(|_| {
        ScanCommandError::from(ScanError::InvalidPath(
            "目录选择器返回了非本地路径。".to_string(),
        ))
    })?;
    let root = validate_scan_root(&selected_path)?;
    let selection_id = make_selection_id();
    let selected_root = SelectedRoot {
        selection_id: selection_id.clone(),
        canonical_root: root.canonical_root,
        display_name: root.display_name.clone(),
        root_summary: root.root_summary.clone(),
    };

    let mut guard = state.selected_root.lock().map_err(|_| {
        ScanCommandError::from(ScanError::Permission("扫描状态锁定失败。".to_string()))
    })?;
    *guard = Some(selected_root);

    Ok(Some(SelectedScanDirectory {
        selection_id,
        display_name: root.display_name,
        root_summary: root.root_summary,
        policy_decision: "allowed_custom_directory",
    }))
}

#[tauri::command]
pub fn scan_custom_directory(
    selection_id: String,
    state: State<'_, ScanState>,
) -> Result<CustomScanResult, ScanCommandError> {
    let selected_root = {
        let guard = state.selected_root.lock().map_err(|_| {
            ScanCommandError::from(ScanError::Permission("扫描状态锁定失败。".to_string()))
        })?;
        guard
            .as_ref()
            .filter(|root| root.selection_id == selection_id)
            .cloned()
            .ok_or(ScanError::SelectionMissing)?
    };

    scan_validated_root(&selected_root).map_err(ScanCommandError::from)
}

#[tauri::command]
pub fn get_scan_policy() -> ScannerPolicy {
    scanner_policy()
}

pub fn validate_scan_root(path: &Path) -> Result<ValidatedRoot, ScanCommandError> {
    validate_scan_root_internal(path).map_err(ScanCommandError::from)
}

pub fn redact_relative_path(path: &Path) -> String {
    redact_path_segments(path)
}

#[cfg(test)]
fn classify_resource_kind(path: &Path) -> &'static str {
    classify_resource(path).0
}

fn validate_scan_root_internal(path: &Path) -> Result<ValidatedRoot, ScanError> {
    if path.as_os_str().is_empty() {
        return Err(ScanError::InvalidPath("选择目录为空。".to_string()));
    }

    if is_broad_or_system_root(path) {
        return Err(ScanError::RejectedRoot(
            "该目录过宽或属于系统边界，指定目录扫描 MVP 不接受。".to_string(),
        ));
    }

    let symlink_metadata = fs::symlink_metadata(path)
        .map_err(|error| ScanError::InvalidPath(format!("无法读取目录元数据：{error}")))?;
    if symlink_metadata.file_type().is_symlink() {
        return Err(ScanError::RejectedRoot(
            "不允许选择符号链接目录。".to_string(),
        ));
    }
    if !symlink_metadata.is_dir() {
        return Err(ScanError::InvalidPath("只能选择目录。".to_string()));
    }

    let canonical_root = fs::canonicalize(path)
        .map_err(|error| ScanError::InvalidPath(format!("无法规范化目录：{error}")))?;

    if is_broad_or_system_root(&canonical_root) || is_home_root(&canonical_root) {
        return Err(ScanError::RejectedRoot(
            "该目录过宽或属于系统边界，指定目录扫描 MVP 不接受。".to_string(),
        ));
    }

    Ok(ValidatedRoot {
        display_name: display_name_for_path(&canonical_root),
        root_summary: summarize_root(&canonical_root),
        canonical_root,
    })
}

fn scan_validated_root(selected_root: &SelectedRoot) -> Result<CustomScanResult, ScanError> {
    let policy = scanner_policy();
    let excluded_names_for_filter = policy
        .excluded_names
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    let excluded_names_for_loop = policy
        .excluded_names
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    let mut counts = ScanCounts::default();
    let mut resources = Vec::new();
    let mut warnings = Vec::new();
    let skipped_by_filter = Arc::new(AtomicUsize::new(0));

    let mut builder = WalkBuilder::new(&selected_root.canonical_root);
    builder
        .max_depth(Some(policy.max_depth))
        .follow_links(false)
        .hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .ignore(true)
        .parents(true);

    let root_for_filter = selected_root.canonical_root.clone();
    let skipped_by_filter_ref = Arc::clone(&skipped_by_filter);
    builder.filter_entry(move |entry| {
        if entry.path() == root_for_filter {
            return true;
        }
        let relative = entry
            .path()
            .strip_prefix(&root_for_filter)
            .unwrap_or(entry.path());
        if path_has_excluded_name(relative, &excluded_names_for_filter) {
            skipped_by_filter_ref.fetch_add(1, Ordering::Relaxed);
            return false;
        }
        true
    });

    for entry in builder.build() {
        if counts.visited_entries >= policy.max_entries {
            counts.truncated = true;
            warnings.push(ScanWarning {
                code: "max_entries_reached",
                message: format!(
                    "扫描达到 {} 项上限，后续条目已停止遍历。",
                    policy.max_entries
                ),
                relative_path: None,
            });
            break;
        }

        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                counts.denied_errors += 1;
                warnings.push(ScanWarning {
                    code: "walk_error",
                    message: format!("目录遍历跳过一个条目：{error}"),
                    relative_path: None,
                });
                continue;
            }
        };

        let path = entry.path();
        if path == selected_root.canonical_root {
            continue;
        }

        counts.visited_entries += 1;
        let relative = path
            .strip_prefix(&selected_root.canonical_root)
            .unwrap_or(path);

        if path_has_excluded_name(relative, &excluded_names_for_loop) {
            counts.skipped_by_exclude += 1;
            continue;
        }

        let metadata = match fs::symlink_metadata(path) {
            Ok(metadata) => metadata,
            Err(error) => {
                counts.denied_errors += 1;
                warnings.push(ScanWarning {
                    code: "metadata_denied",
                    message: format!("无法读取条目元数据：{error}"),
                    relative_path: Some(redact_relative_path(relative)),
                });
                continue;
            }
        };

        if metadata.file_type().is_symlink() {
            counts.skipped_symlinks += 1;
            warnings.push(ScanWarning {
                code: "symlink_skipped",
                message: "符号链接未跟随。".to_string(),
                relative_path: Some(redact_relative_path(relative)),
            });
            continue;
        }

        let entry_type = if metadata.is_dir() {
            "directory"
        } else if metadata.is_file() {
            "file"
        } else {
            "other"
        };

        if metadata.is_file() && metadata.len() > policy.max_file_size_bytes {
            counts.skipped_by_size += 1;
            warnings.push(ScanWarning {
                code: "max_file_size_skipped",
                message: format!("文件超过 {} 字节元数据阈值。", policy.max_file_size_bytes),
                relative_path: Some(redact_relative_path(relative)),
            });
            continue;
        }

        let (resource_kind, classification_reason) = classify_resource(relative);
        let redacted_relative = redact_relative_path(relative);
        let sensitive = path_has_sensitive_segment(relative);

        resources.push(ScanResource {
            id: format!("custom-scan:{resource_kind}:{redacted_relative}"),
            relative_path: redacted_relative,
            entry_type,
            extension: extension_for_path(relative),
            size_bytes: metadata.is_file().then_some(metadata.len()),
            modified_at_ms: modified_at_ms(&metadata),
            resource_kind,
            risk_labels: risk_labels_for(resource_kind, sensitive),
            boundary_labels: boundary_labels_for(resource_kind, sensitive),
            classification_reason,
            sensitive,
        });
    }

    counts.skipped_by_exclude += skipped_by_filter.load(Ordering::Relaxed);
    counts.returned_resources = resources.len();

    Ok(CustomScanResult {
        policy_id: POLICY_ID,
        root_display_name: selected_root.display_name.clone(),
        root_summary: selected_root.root_summary.clone(),
        scanned_at_ms: current_time_ms(),
        counts,
        resources,
        warnings,
    })
}

fn scanner_policy() -> ScannerPolicy {
    ScannerPolicy {
        policy_id: POLICY_ID,
        metadata_only: true,
        content_reading_enabled: false,
        execution_enabled: false,
        full_disk_scan_enabled: false,
        follow_symlinks: false,
        respects_ignore_files: true,
        max_depth: MAX_DEPTH,
        max_entries: MAX_ENTRIES,
        max_file_size_bytes: MAX_FILE_SIZE_BYTES,
        blocked_root_examples: vec![
            "/",
            "~",
            "/Users",
            "/Volumes",
            "/System",
            "/Library",
            "/Applications",
            "/private",
            "/tmp",
            "C:\\",
            "C:\\Users",
            "C:\\Windows",
        ],
        excluded_names: vec![
            ".git",
            "node_modules",
            "target",
            "dist",
            "build",
            ".next",
            ".nuxt",
            ".turbo",
            ".cache",
            ".venv",
            "venv",
            "__pycache__",
            ".DS_Store",
            "coverage",
            "logs",
            "tmp",
            "temp",
            ".pnpm-store",
            ".pnpm",
            ".yarn",
            ".npm",
            ".cargo",
            ".rustup",
        ],
        resource_kinds: vec![
            "skill",
            "prompt",
            "mcp-config",
            "script",
            "report-doc",
            "project-pack",
            "policy-governance",
            "validator",
            "package-manifest",
            "unknown-local-resource",
        ],
    }
}

fn classify_resource(path: &Path) -> (&'static str, &'static str) {
    let normalized = path_to_slash(path).to_lowercase();
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_lowercase();

    if file_name == "skill.md"
        || normalized.contains("/skills/")
        || normalized.starts_with("skills/")
    {
        return ("skill", "路径或文件名匹配技能资源。");
    }
    if normalized.contains("/prompts/")
        || normalized.starts_with("prompts/")
        || file_name.contains("prompt")
    {
        return ("prompt", "路径或文件名匹配提示词资源。");
    }
    if normalized.contains("/.mcp/")
        || normalized.starts_with(".mcp/")
        || file_name.contains("mcp")
            && matches!(extension.as_str(), "json" | "toml" | "yaml" | "yml")
    {
        return ("mcp-config", "路径或文件名匹配 MCP 配置元数据。");
    }
    if file_name.contains("validate")
        || file_name.contains("validator")
        || file_name.contains("doctor")
        || normalized.contains("/validators/")
        || normalized.starts_with("validators/")
    {
        return ("validator", "路径或文件名匹配验证器。");
    }
    if normalized.contains("/scripts/")
        || normalized.starts_with("scripts/")
        || matches!(
            extension.as_str(),
            "sh" | "bash" | "zsh" | "js" | "mjs" | "ts" | "py"
        )
    {
        return ("script", "路径或扩展名匹配脚本入口；不会执行。");
    }
    if normalized.contains("/reports/")
        || normalized.starts_with("reports/")
        || normalized.contains("/docs/")
        || normalized.starts_with("docs/")
        || file_name.contains("report")
    {
        return ("report-doc", "路径或文件名匹配报告或文档。");
    }
    if normalized.contains("project-pack")
        || normalized.contains("/packs/")
        || normalized.starts_with("packs/")
        || normalized.contains("/fixtures/")
    {
        return ("project-pack", "路径匹配项目资源包。");
    }
    if file_name.contains("policy")
        || file_name.contains("governance")
        || file_name.contains("guard")
        || normalized.contains("/policies/")
        || normalized.starts_with("policies/")
    {
        return ("policy-governance", "路径或文件名匹配策略治理资源。");
    }
    if matches!(
        file_name.as_str(),
        "package.json"
            | "pnpm-workspace.yaml"
            | "cargo.toml"
            | "pyproject.toml"
            | "requirements.txt"
            | "deno.json"
            | "bun.lockb"
    ) {
        return ("package-manifest", "文件名匹配包或项目 manifest。");
    }

    (
        "unknown-local-resource",
        "未匹配已知 AIOS 资源类别，仅保留本地元数据。",
    )
}

fn is_broad_or_system_root(path: &Path) -> bool {
    let normalized = normalize_for_policy(path);
    if matches!(
        normalized.as_str(),
        "/" | "/users"
            | "/volumes"
            | "/system"
            | "/library"
            | "/applications"
            | "/private"
            | "/private/tmp"
            | "/tmp"
            | "/var"
            | "/etc"
            | "/bin"
            | "/sbin"
            | "/usr"
            | "/opt"
            | "/dev"
            | "/proc"
            | "/run"
            | "/mnt"
            | "/home"
    ) {
        return true;
    }

    let mut components = path.components();
    matches!(
        (components.next(), components.next(), components.next()),
        (Some(Component::Prefix(_)), Some(Component::RootDir), None)
            | (
                Some(Component::Prefix(_)),
                Some(Component::RootDir),
                Some(Component::Normal(_))
            )
    ) && matches!(
        normalized.as_str(),
        value if value.ends_with(":/")
            || value.ends_with(":/users")
            || value.ends_with(":/windows")
            || value.ends_with(":/program files")
            || value.ends_with(":/program files (x86)")
            || value.ends_with(":/programdata")
    )
}

fn is_home_root(path: &Path) -> bool {
    home_dir()
        .and_then(|home| fs::canonicalize(home).ok())
        .is_some_and(|home| home == path)
}

fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("USERPROFILE").map(PathBuf::from))
}

fn normalize_for_policy(path: &Path) -> String {
    let normalized = path.to_string_lossy().replace('\\', "/").to_lowercase();
    let trimmed = normalized.trim_end_matches('/');
    if trimmed.is_empty() && normalized.starts_with('/') {
        "/".to_string()
    } else {
        trimmed.to_string()
    }
}

fn display_name_for_path(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .map(|value| {
            if is_secret_like_segment(value) {
                REDACTED_SEGMENT.to_string()
            } else {
                value.to_string()
            }
        })
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "已选择目录".to_string())
}

fn summarize_root(path: &Path) -> String {
    if let Some(home) = home_dir().and_then(|home| fs::canonicalize(home).ok()) {
        if let Ok(relative) = path.strip_prefix(home) {
            let redacted = redact_path_segments(relative);
            return if redacted.is_empty() {
                "~".to_string()
            } else {
                format!("~/{redacted}")
            };
        }
    }

    redact_path_segments(path)
}

fn path_has_excluded_name(path: &Path, excluded_names: &HashSet<&str>) -> bool {
    path.components().any(|component| {
        let Component::Normal(segment) = component else {
            return false;
        };
        let lower = segment.to_string_lossy().to_lowercase();
        excluded_names.contains(lower.as_str())
    })
}

fn path_has_sensitive_segment(path: &Path) -> bool {
    path.components().any(|component| {
        matches!(component, Component::Normal(segment) if is_secret_like_segment(&segment.to_string_lossy()))
    })
}

fn redact_path_segments(path: &Path) -> String {
    path.components()
        .filter_map(|component| match component {
            Component::Normal(segment) => {
                let segment = segment.to_string_lossy();
                if is_secret_like_segment(&segment) {
                    Some(REDACTED_SEGMENT.to_string())
                } else {
                    Some(segment.to_string())
                }
            }
            Component::RootDir => Some(String::new()),
            Component::Prefix(prefix) => Some(prefix.as_os_str().to_string_lossy().to_string()),
            _ => None,
        })
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join("/")
}

fn is_secret_like_segment(segment: &str) -> bool {
    let lower = segment.to_lowercase();
    lower == ".env"
        || lower.ends_with(".env")
        || lower.ends_with(".pem")
        || lower.ends_with(".key")
        || lower == "id_rsa"
        || lower == "id_dsa"
        || lower == "id_ecdsa"
        || lower == "id_ed25519"
        || lower.contains("secret")
        || lower.contains("token")
        || lower.contains("credential")
        || lower.contains("auth")
        || lower.contains("session")
        || lower.contains("cookie")
        || lower.contains("keychain")
        || lower.contains("private")
        || lower.contains("api_key")
        || lower.contains("apikey")
}

fn extension_for_path(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_lowercase())
        .filter(|value| !value.is_empty())
}

fn modified_at_ms(metadata: &fs::Metadata) -> Option<u64> {
    metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis().min(u64::MAX as u128) as u64)
}

fn current_time_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().min(u64::MAX as u128) as u64)
        .unwrap_or_default()
}

fn make_selection_id() -> String {
    format!("custom-dir-{}", current_time_ms())
}

fn path_to_slash(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn risk_labels_for(resource_kind: &'static str, sensitive: bool) -> Vec<&'static str> {
    let mut labels = vec!["metadata-only"];
    if sensitive {
        labels.push("sensitive-path-redacted");
    }
    if matches!(resource_kind, "script" | "validator") {
        labels.push("execution-disabled");
    }
    if resource_kind == "mcp-config" {
        labels.push("mcp-not-executed");
    }
    labels
}

fn boundary_labels_for(resource_kind: &'static str, sensitive: bool) -> Vec<&'static str> {
    let mut labels = vec!["read-only", "no-content-read", "no-symlink-follow"];
    if sensitive {
        labels.push("redacted");
    }
    if matches!(resource_kind, "script" | "validator" | "mcp-config") {
        labels.push("not-executed");
    }
    labels
}

impl From<ScanError> for ScanCommandError {
    fn from(error: ScanError) -> Self {
        match error {
            ScanError::InvalidPath(message) => Self {
                code: "invalid_path",
                message,
            },
            ScanError::RejectedRoot(message) => Self {
                code: "rejected_root",
                message,
            },
            ScanError::Permission(message) => Self {
                code: "permission_error",
                message,
            },
            ScanError::SelectionMissing => Self {
                code: "selection_missing",
                message: "请先通过系统目录选择器选择一个目录。".to_string(),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{classify_resource_kind, redact_relative_path, validate_scan_root};
    use std::path::Path;

    #[test]
    fn rejects_broad_machine_roots() {
        for root in [
            "/",
            "/Users",
            "/System",
            "/Library",
            "/Applications",
            "/Volumes",
            "/private",
            "/tmp",
        ] {
            let result = validate_scan_root(Path::new(root));
            assert!(result.is_err(), "expected {root} to be rejected");
        }
    }

    #[test]
    fn redacts_secret_like_path_segments() {
        let redacted = redact_relative_path(Path::new("configs/prod.env"));

        assert_eq!(redacted, "configs/[sensitive]");
    }

    #[test]
    fn classifies_resources_without_reading_file_contents() {
        assert_eq!(
            classify_resource_kind(Path::new("skills/writer/SKILL.md")),
            "skill"
        );
        assert_eq!(
            classify_resource_kind(Path::new(".mcp/servers.json")),
            "mcp-config"
        );
        assert_eq!(
            classify_resource_kind(Path::new("scripts/validate-aios.mjs")),
            "validator"
        );
        assert_eq!(
            classify_resource_kind(Path::new("reports/phase-2.md")),
            "report-doc"
        );
        assert_eq!(
            classify_resource_kind(Path::new("package.json")),
            "package-manifest"
        );
        assert_eq!(
            classify_resource_kind(Path::new("misc/local.txt")),
            "unknown-local-resource"
        );
    }
}
