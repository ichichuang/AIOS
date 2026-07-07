use crate::resource_store::{
    self, PersistScanErrorInput, PersistScanJobInput, PersistScanResourceInput,
    PersistScanSkipInput, PersistScanSourceInput, UpsertScanSourceInput,
};
use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Read;
use std::path::{Component, Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, AtomicUsize, Ordering},
    Arc, Mutex,
};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, State};
use tauri_plugin_dialog::DialogExt;

const POLICY_ID: &str = "custom-directory-metadata-scan-mvp";
const DEFAULT_SCAN_PROFILE_ID: &str = "custom-folder";
const INTELLIGENT_DISCOVERY_PROFILE_ID: &str = "intelligent-discovery";
const ADVANCED_FULL_DISK_PROFILE_ID: &str = "advanced-full-disk";
const CUSTOM_DIRECTORY_SOURCE_KIND: &str = "custom-directory";
const INTELLIGENT_DISCOVERY_SOURCE_KIND: &str = "intelligent-discovery";
const ADVANCED_FULL_DISK_SOURCE_KIND: &str = "advanced-full-disk";
const MAX_DEPTH: usize = 6;
const MAX_ENTRIES: usize = 2_000;
const MAX_FILE_SIZE_BYTES: u64 = 10 * 1024 * 1024;
const MAX_SKILL_MANIFEST_METADATA_BYTES: usize = 64 * 1024;
const MAX_SKILL_MANIFEST_NAME_CHARS: usize = 96;
const MAX_SKILL_MANIFEST_DESCRIPTION_CHARS: usize = 320;
const MAX_RETAINED_SCAN_JOBS: usize = 8;
const SCAN_JOB_PROGRESS_EVENT: &str = "aios://scan-job-progress";
const REDACTED_SEGMENT: &str = "[sensitive]";
static NEXT_SCAN_JOB_COUNTER: AtomicUsize = AtomicUsize::new(1);
static NEXT_SCAN_BATCH_COUNTER: AtomicUsize = AtomicUsize::new(1);

#[derive(Default)]
pub struct ScanState {
    selected_root: Mutex<Option<SelectedRoot>>,
    jobs: Arc<Mutex<HashMap<String, ScanJobRecord>>>,
    batches: Arc<Mutex<HashMap<String, ScanBatchRecord>>>,
}

#[derive(Clone, Debug)]
struct SelectedRoot {
    selection_id: String,
    canonical_root: PathBuf,
    display_name: String,
    root_summary: String,
    source_kind: String,
    user_confirmed_mode: bool,
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
    default_profile_id: &'static str,
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
    profile_ids: Vec<&'static str>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProfileDefinition {
    id: &'static str,
    display_name: &'static str,
    short_description: &'static str,
    recommended_use_case: &'static str,
    safety_boundary: &'static str,
    example_folder_types: Vec<&'static str>,
    max_depth: usize,
    max_entries: usize,
    max_depth_entry_policy: &'static str,
    exclude_policy_summary: &'static str,
    classification_emphasis: Vec<&'static str>,
    emphasized_resource_kinds: Vec<&'static str>,
    result_group_label: &'static str,
    metadata_only: bool,
    content_reading_enabled: bool,
    execution_enabled: bool,
    full_disk_scan_enabled: bool,
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
    profile: ScanProfileDefinition,
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
    skipped_by_guard: usize,
    skipped_by_metadata_error: usize,
    skipped_by_limit: usize,
    skipped_by_depth_limit: usize,
    skipped_by_cancellation: usize,
    skipped_by_size: usize,
    skipped_symlinks: usize,
    skipped_unsupported_roots: usize,
    skipped_duplicate_sources: usize,
    denied_errors: usize,
    truncated: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ScanJobStatus {
    Queued,
    Running,
    Cancelling,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    visited_entries: usize,
    matched_resources: usize,
    skipped_entries: usize,
    elapsed_ms: u64,
    current_phase: &'static str,
    profile_id: &'static str,
    max_entries: usize,
    max_depth: usize,
    truncated: bool,
    cancellation_requested: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanJobSnapshot {
    job_id: String,
    status: ScanJobStatus,
    profile_id: &'static str,
    root_display_name: String,
    root_summary: String,
    started_at_ms: u64,
    updated_at_ms: u64,
    completed_at_ms: Option<u64>,
    progress: ScanProgress,
    result: Option<CustomScanResult>,
    error: Option<ScanCommandError>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanStarted {
    job_id: String,
    snapshot: ScanJobSnapshot,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddScanSourcesResult {
    sources: Vec<resource_store::PersistedScanSource>,
    selected_count: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ScanMode {
    CustomDirectory,
    IntelligentDiscovery,
    AdvancedFullDisk,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddDiscoveryScanSourcesInput {
    mode: String,
    advanced_confirmation_accepted: Option<bool>,
    project_label: Option<String>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ScanBatchStatus {
    Queued,
    Running,
    Cancelling,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub enum ScanBatchSourceStatus {
    Idle,
    Queued,
    Running,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanBatchProgress {
    completed_sources: usize,
    total_sources: usize,
    active_visited_entries: usize,
    active_matched_resources: usize,
    active_skipped_entries: usize,
    elapsed_ms: u64,
    cancellation_requested: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanBatchSourceSnapshot {
    scan_source_id: String,
    display_name: String,
    root_display_path: String,
    profile_id: String,
    project_label: Option<String>,
    status: ScanBatchSourceStatus,
    job_id: Option<String>,
    resources_found: u64,
    skipped_entries: u64,
    error_count: u64,
    last_scanned_at_ms: Option<u64>,
    message: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanBatchSnapshot {
    batch_id: String,
    status: ScanBatchStatus,
    started_at_ms: u64,
    updated_at_ms: u64,
    completed_at_ms: Option<u64>,
    total_sources: usize,
    completed_sources: usize,
    cancelled_sources: usize,
    failed_sources: usize,
    active_source_id: Option<String>,
    progress: ScanBatchProgress,
    sources: Vec<ScanBatchSourceSnapshot>,
    error: Option<ScanCommandError>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanBatchStarted {
    batch_id: String,
    snapshot: ScanBatchSnapshot,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ScanCompleted {
    job_id: String,
    snapshot: ScanJobSnapshot,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ScanCancelled {
    job_id: String,
    snapshot: ScanJobSnapshot,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ScanFailed {
    job_id: String,
    snapshot: ScanJobSnapshot,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanJobEventPayload {
    job_id: String,
    status: ScanJobStatus,
    progress: ScanProgress,
    error: Option<ScanCommandError>,
}

#[derive(Clone, Default)]
struct ScanCancellation {
    requested: Arc<AtomicBool>,
}

#[derive(Clone)]
struct ScanJobRecord {
    cancellation: ScanCancellation,
    snapshot: ScanJobSnapshot,
}

#[derive(Clone)]
struct ScanBatchRecord {
    cancellation: ScanCancellation,
    snapshot: ScanBatchSnapshot,
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
    #[serde(skip_serializing)]
    skill_manifest_metadata: Option<SkillManifestMetadata>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct SkillManifestMetadata {
    name: Option<String>,
    description: Option<String>,
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
    InvalidProfile(String),
    InvalidInput(String),
    JobConflict(String),
    JobMissing(String),
    BatchMissing(String),
    Cancelled,
    RejectedRoot(String),
    AdvancedConfirmationRequired,
    Permission(String),
    SelectionMissing,
    Store(String),
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
        source_kind: CUSTOM_DIRECTORY_SOURCE_KIND.to_string(),
        user_confirmed_mode: true,
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
pub async fn add_scan_sources(
    app: tauri::AppHandle,
    profile_id: Option<String>,
    project_label: Option<String>,
    store: State<'_, resource_store::ResourceStoreState>,
) -> Result<AddScanSourcesResult, ScanCommandError> {
    let profile = resolve_custom_directory_scan_profile(profile_id.as_deref())
        .map_err(ScanCommandError::from)?;
    let selected = app
        .dialog()
        .file()
        .set_title("添加扫描来源目录")
        .set_can_create_directories(false)
        .blocking_pick_folders();

    let Some(selected_paths) = selected else {
        return Ok(AddScanSourcesResult {
            sources: Vec::new(),
            selected_count: 0,
        });
    };

    let mut sources = Vec::new();
    let selected_count = selected_paths.len();
    for selected in selected_paths {
        let selected_path = selected.into_path().map_err(|_| {
            ScanCommandError::from(ScanError::InvalidPath(
                "目录选择器返回了非本地路径。".to_string(),
            ))
        })?;
        let root = validate_scan_root(&selected_path)?;
        let source = resource_store::upsert_scan_source_for_path(
            &store.db_path(),
            UpsertScanSourceInput {
                id: None,
                display_name: root.display_name.clone(),
                root_path: root.canonical_root.to_string_lossy().to_string(),
                root_display_path: root.root_summary.clone(),
                profile_id: profile.id.to_string(),
                source_kind: CUSTOM_DIRECTORY_SOURCE_KIND.to_string(),
                project_label: normalize_optional_label(project_label.as_deref()),
                enabled: true,
            },
        )
        .map_err(store_error_to_scan_error)
        .map_err(ScanCommandError::from)?;
        sources.push(source);
    }

    Ok(AddScanSourcesResult {
        sources,
        selected_count,
    })
}

#[tauri::command]
pub fn add_discovery_scan_sources(
    input: AddDiscoveryScanSourcesInput,
    store: State<'_, resource_store::ResourceStoreState>,
) -> Result<AddScanSourcesResult, ScanCommandError> {
    let mode = resolve_scan_mode(&input.mode).map_err(ScanCommandError::from)?;
    if mode == ScanMode::CustomDirectory {
        return Err(ScanCommandError::from(ScanError::InvalidInput(
            "Custom Directories must be added through the system directory picker.".to_string(),
        )));
    }
    let confirmed = input.advanced_confirmation_accepted.unwrap_or(false);
    let profile = resolve_scan_profile(Some(mode.profile_id())).map_err(ScanCommandError::from)?;
    let roots = resolve_discovery_scan_roots(&mode, confirmed).map_err(ScanCommandError::from)?;
    if roots.is_empty() {
        return Err(ScanCommandError::from(ScanError::InvalidInput(
            "未找到可用的发现候选目录。".to_string(),
        )));
    }

    let mut sources = Vec::new();
    for root in roots {
        let source = resource_store::upsert_scan_source_for_path(
            &store.db_path(),
            UpsertScanSourceInput {
                id: None,
                display_name: discovery_display_name(&mode, &root),
                root_path: root.canonical_root.to_string_lossy().to_string(),
                root_display_path: root.root_summary.clone(),
                profile_id: profile.id.to_string(),
                source_kind: mode.source_kind().to_string(),
                project_label: normalize_optional_label(input.project_label.as_deref())
                    .or_else(|| Some(mode.default_project_label().to_string())),
                enabled: true,
            },
        )
        .map_err(store_error_to_scan_error)
        .map_err(ScanCommandError::from)?;
        sources.push(source);
    }

    Ok(AddScanSourcesResult {
        selected_count: sources.len(),
        sources,
    })
}

#[tauri::command]
pub fn scan_custom_directory(
    selection_id: String,
    profile_id: Option<String>,
    state: State<'_, ScanState>,
    store: State<'_, resource_store::ResourceStoreState>,
) -> Result<CustomScanResult, ScanCommandError> {
    let profile = resolve_scan_profile(profile_id.as_deref()).map_err(ScanCommandError::from)?;
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

    let started_at_ms = current_time_ms();
    let result = scan_validated_root(&selected_root, &profile).map_err(ScanCommandError::from)?;
    let finished_at_ms = current_time_ms();
    persist_completed_scan_result(
        &store.db_path(),
        &make_scan_job_id(),
        "scan_custom_directory",
        started_at_ms,
        finished_at_ms,
        &selected_root,
        &profile,
        &result,
    )
    .map_err(ScanCommandError::from)?;

    Ok(result)
}

#[tauri::command]
pub fn start_custom_scan_job(
    app: tauri::AppHandle,
    selection_id: String,
    profile_id: Option<String>,
    state: State<'_, ScanState>,
    store: State<'_, resource_store::ResourceStoreState>,
) -> Result<ScanStarted, ScanCommandError> {
    let profile = resolve_scan_profile(profile_id.as_deref()).map_err(ScanCommandError::from)?;
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
    let job_id = make_scan_job_id();
    let started_at_ms = current_time_ms();
    let cancellation = ScanCancellation::default();
    let progress = ScanProgress::from_counts(
        profile.id,
        &ScanCounts::default(),
        0,
        started_at_ms,
        "queued",
        false,
        profile.max_depth,
        profile.max_entries,
    );
    let snapshot = ScanJobSnapshot {
        job_id: job_id.clone(),
        status: ScanJobStatus::Queued,
        profile_id: profile.id,
        root_display_name: selected_root.display_name.clone(),
        root_summary: selected_root.root_summary.clone(),
        started_at_ms,
        updated_at_ms: started_at_ms,
        completed_at_ms: None,
        progress,
        result: None,
        error: None,
    };
    let record = ScanJobRecord {
        cancellation: cancellation.clone(),
        snapshot: snapshot.clone(),
    };

    ensure_no_active_batches(&state.batches).map_err(ScanCommandError::from)?;
    insert_scan_job(&state.jobs, job_id.clone(), record).map_err(ScanCommandError::from)?;

    let jobs = Arc::clone(&state.jobs);
    let worker_job_id = job_id.clone();
    let resource_store_path = store.db_path();
    thread::spawn(move || {
        run_scan_job_worker(
            app,
            jobs,
            worker_job_id,
            selected_root,
            profile,
            cancellation,
            resource_store_path,
        );
    });

    Ok(ScanStarted { job_id, snapshot })
}

#[tauri::command]
pub fn cancel_scan_job(
    job_id: String,
    state: State<'_, ScanState>,
) -> Result<ScanJobSnapshot, ScanCommandError> {
    let mut jobs = state.jobs.lock().map_err(|_| {
        ScanCommandError::from(ScanError::Permission("扫描状态锁定失败。".to_string()))
    })?;
    let record = jobs
        .get_mut(&job_id)
        .ok_or_else(|| ScanError::JobMissing("未找到扫描任务。".to_string()))?;
    record.cancellation.request();
    if matches!(
        record.snapshot.status,
        ScanJobStatus::Queued | ScanJobStatus::Running
    ) {
        record.snapshot.status = ScanJobStatus::Cancelling;
        record.snapshot.progress.cancellation_requested = true;
        record.snapshot.progress.current_phase = "cancelling";
        record.snapshot.updated_at_ms = current_time_ms();
    }

    Ok(record.snapshot.clone())
}

#[tauri::command]
pub fn get_scan_job_snapshot(
    job_id: String,
    state: State<'_, ScanState>,
) -> Result<ScanJobSnapshot, ScanCommandError> {
    let jobs = state.jobs.lock().map_err(|_| {
        ScanCommandError::from(ScanError::Permission("扫描状态锁定失败。".to_string()))
    })?;
    jobs.get(&job_id)
        .map(|record| record.snapshot.clone())
        .ok_or_else(|| {
            ScanCommandError::from(ScanError::JobMissing("未找到扫描任务。".to_string()))
        })
}

#[tauri::command]
pub fn start_scan_sources_batch(
    app: tauri::AppHandle,
    source_ids: Vec<String>,
    advanced_confirmation_accepted: Option<bool>,
    state: State<'_, ScanState>,
    store: State<'_, resource_store::ResourceStoreState>,
) -> Result<ScanBatchStarted, ScanCommandError> {
    let normalized_ids = normalize_source_ids(source_ids).map_err(ScanCommandError::from)?;
    let sources = resource_store::list_enabled_stored_scan_sources_for_path(
        &store.db_path(),
        &normalized_ids,
    )
    .map_err(store_error_to_scan_error)
    .map_err(ScanCommandError::from)?;
    if sources.is_empty() {
        return Err(ScanCommandError::from(ScanError::InvalidInput(
            "没有可扫描的已启用来源。".to_string(),
        )));
    }
    if sources
        .iter()
        .any(|source| source.source_kind == ADVANCED_FULL_DISK_SOURCE_KIND)
        && !advanced_confirmation_accepted.unwrap_or(false)
    {
        return Err(ScanCommandError::from(
            ScanError::AdvancedConfirmationRequired,
        ));
    }
    ensure_no_active_jobs(&state.jobs).map_err(ScanCommandError::from)?;
    ensure_no_active_batches(&state.batches).map_err(ScanCommandError::from)?;

    let batch_id = make_scan_batch_id();
    let started_at_ms = current_time_ms();
    let cancellation = ScanCancellation::default();
    let source_snapshots = sources
        .iter()
        .map(|source| {
            ScanBatchSourceSnapshot::from_stored_source(source, ScanBatchSourceStatus::Queued)
        })
        .collect::<Vec<_>>();
    let snapshot = ScanBatchSnapshot {
        batch_id: batch_id.clone(),
        status: ScanBatchStatus::Queued,
        started_at_ms,
        updated_at_ms: started_at_ms,
        completed_at_ms: None,
        total_sources: source_snapshots.len(),
        completed_sources: 0,
        cancelled_sources: 0,
        failed_sources: 0,
        active_source_id: None,
        progress: ScanBatchProgress {
            completed_sources: 0,
            total_sources: source_snapshots.len(),
            active_visited_entries: 0,
            active_matched_resources: 0,
            active_skipped_entries: 0,
            elapsed_ms: 0,
            cancellation_requested: false,
        },
        sources: source_snapshots,
        error: None,
    };
    insert_scan_batch(
        &state.batches,
        batch_id.clone(),
        ScanBatchRecord {
            cancellation: cancellation.clone(),
            snapshot: snapshot.clone(),
        },
    )
    .map_err(ScanCommandError::from)?;

    let jobs = Arc::clone(&state.jobs);
    let batches = Arc::clone(&state.batches);
    let resource_store_path = store.db_path();
    let worker_batch_id = batch_id.clone();
    thread::spawn(move || {
        run_scan_batch_worker(
            app,
            jobs,
            batches,
            worker_batch_id,
            sources,
            cancellation,
            resource_store_path,
        );
    });

    Ok(ScanBatchStarted { batch_id, snapshot })
}

#[tauri::command]
pub fn cancel_scan_batch(
    batch_id: String,
    state: State<'_, ScanState>,
) -> Result<ScanBatchSnapshot, ScanCommandError> {
    let mut batches = state.batches.lock().map_err(|_| {
        ScanCommandError::from(ScanError::Permission("扫描批次状态锁定失败。".to_string()))
    })?;
    let record = batches
        .get_mut(&batch_id)
        .ok_or_else(|| ScanError::BatchMissing("未找到扫描批次。".to_string()))?;
    record.cancellation.request();
    if record.snapshot.status.is_active() {
        record.snapshot.status = ScanBatchStatus::Cancelling;
        record.snapshot.progress.cancellation_requested = true;
        record.snapshot.updated_at_ms = current_time_ms();
    }
    Ok(record.snapshot.clone())
}

#[tauri::command]
pub fn get_scan_batch_snapshot(
    batch_id: String,
    state: State<'_, ScanState>,
) -> Result<ScanBatchSnapshot, ScanCommandError> {
    let batches = state.batches.lock().map_err(|_| {
        ScanCommandError::from(ScanError::Permission("扫描批次状态锁定失败。".to_string()))
    })?;
    batches
        .get(&batch_id)
        .map(|record| record.snapshot.clone())
        .ok_or_else(|| {
            ScanCommandError::from(ScanError::BatchMissing("未找到扫描批次。".to_string()))
        })
}

#[tauri::command]
pub fn get_scan_policy() -> ScannerPolicy {
    scanner_policy()
}

#[tauri::command]
pub fn get_scan_profiles() -> Vec<ScanProfileDefinition> {
    scan_profiles()
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

fn resolve_scan_profile(profile_id: Option<&str>) -> Result<ScanProfileDefinition, ScanError> {
    let requested_id = profile_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_SCAN_PROFILE_ID);

    scan_profiles()
        .into_iter()
        .find(|profile| profile.id == requested_id)
        .ok_or_else(|| ScanError::InvalidProfile(format!("未知扫描模板：{requested_id}")))
}

fn resolve_custom_directory_scan_profile(
    profile_id: Option<&str>,
) -> Result<ScanProfileDefinition, ScanError> {
    let profile = resolve_scan_profile(profile_id)?;
    if matches!(
        profile.id,
        INTELLIGENT_DISCOVERY_PROFILE_ID | ADVANCED_FULL_DISK_PROFILE_ID
    ) {
        return Err(ScanError::InvalidInput(
            "发现扫描模板不能用于普通自选目录来源。".to_string(),
        ));
    }
    Ok(profile)
}

fn resolve_scan_mode(mode: &str) -> Result<ScanMode, ScanError> {
    match mode.trim() {
        CUSTOM_DIRECTORY_SOURCE_KIND | "custom" | "" => Ok(ScanMode::CustomDirectory),
        INTELLIGENT_DISCOVERY_SOURCE_KIND | "intelligent" => Ok(ScanMode::IntelligentDiscovery),
        ADVANCED_FULL_DISK_SOURCE_KIND | "advanced" => Ok(ScanMode::AdvancedFullDisk),
        other => Err(ScanError::InvalidInput(format!("未知扫描模式：{other}"))),
    }
}

impl ScanMode {
    fn source_kind(&self) -> &'static str {
        match self {
            ScanMode::CustomDirectory => CUSTOM_DIRECTORY_SOURCE_KIND,
            ScanMode::IntelligentDiscovery => INTELLIGENT_DISCOVERY_SOURCE_KIND,
            ScanMode::AdvancedFullDisk => ADVANCED_FULL_DISK_SOURCE_KIND,
        }
    }

    fn profile_id(&self) -> &'static str {
        match self {
            ScanMode::CustomDirectory => DEFAULT_SCAN_PROFILE_ID,
            ScanMode::IntelligentDiscovery => INTELLIGENT_DISCOVERY_PROFILE_ID,
            ScanMode::AdvancedFullDisk => ADVANCED_FULL_DISK_PROFILE_ID,
        }
    }

    fn default_project_label(&self) -> &'static str {
        match self {
            ScanMode::CustomDirectory => "Custom Directories",
            ScanMode::IntelligentDiscovery => "Intelligent Discovery",
            ScanMode::AdvancedFullDisk => "Advanced Full-Disk Discovery",
        }
    }
}

impl ScanCancellation {
    fn request(&self) {
        self.requested.store(true, Ordering::Relaxed);
    }

    fn is_requested(&self) -> bool {
        self.requested.load(Ordering::Relaxed)
    }
}

impl ScanJobStatus {
    fn is_active(&self) -> bool {
        matches!(
            self,
            ScanJobStatus::Queued | ScanJobStatus::Running | ScanJobStatus::Cancelling
        )
    }
}

impl ScanBatchStatus {
    fn is_active(&self) -> bool {
        matches!(
            self,
            ScanBatchStatus::Queued | ScanBatchStatus::Running | ScanBatchStatus::Cancelling
        )
    }
}

impl ScanBatchSourceSnapshot {
    fn from_stored_source(
        source: &resource_store::StoredScanSource,
        status: ScanBatchSourceStatus,
    ) -> Self {
        Self {
            scan_source_id: source.id.clone(),
            display_name: source.display_name.clone(),
            root_display_path: source.root_display_path.clone(),
            profile_id: source.profile_id.clone(),
            project_label: source.project_label.clone(),
            status,
            job_id: None,
            resources_found: 0,
            skipped_entries: 0,
            error_count: 0,
            last_scanned_at_ms: None,
            message: None,
        }
    }
}

impl ScanProgress {
    fn from_counts(
        profile_id: &'static str,
        counts: &ScanCounts,
        matched_resources: usize,
        started_at_ms: u64,
        current_phase: &'static str,
        cancellation_requested: bool,
        max_depth: usize,
        max_entries: usize,
    ) -> Self {
        let skipped_entries = counts.skipped_by_exclude
            + counts.skipped_by_guard
            + counts.skipped_by_metadata_error
            + counts.skipped_by_limit
            + counts.skipped_by_cancellation
            + counts.skipped_by_size
            + counts.skipped_symlinks;

        Self {
            visited_entries: counts.visited_entries,
            matched_resources,
            skipped_entries,
            elapsed_ms: current_time_ms().saturating_sub(started_at_ms),
            current_phase,
            profile_id,
            max_entries,
            max_depth,
            truncated: counts.truncated,
            cancellation_requested,
        }
    }
}

fn build_scan_job_event_payload(
    job_id: &str,
    status: ScanJobStatus,
    progress: ScanProgress,
    error: Option<ScanCommandError>,
) -> ScanJobEventPayload {
    ScanJobEventPayload {
        job_id: job_id.to_string(),
        status,
        progress,
        error,
    }
}

fn make_scan_job_id() -> String {
    let counter = NEXT_SCAN_JOB_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("scan-job-{}-{counter}", current_time_ms())
}

fn make_scan_batch_id() -> String {
    let counter = NEXT_SCAN_BATCH_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("scan-batch-{}-{counter}", current_time_ms())
}

fn normalize_source_ids(source_ids: Vec<String>) -> Result<Vec<String>, ScanError> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();
    for source_id in source_ids {
        let source_id = source_id.trim();
        if source_id.is_empty() || !seen.insert(source_id.to_string()) {
            continue;
        }
        normalized.push(source_id.to_string());
    }
    if normalized.is_empty() {
        return Err(ScanError::InvalidInput(
            "请至少选择一个扫描来源。".to_string(),
        ));
    }
    Ok(normalized)
}

fn ensure_no_active_jobs(
    jobs: &Arc<Mutex<HashMap<String, ScanJobRecord>>>,
) -> Result<(), ScanError> {
    let guard = jobs
        .lock()
        .map_err(|_| ScanError::Permission("扫描状态锁定失败。".to_string()))?;
    if guard
        .values()
        .any(|existing| existing.snapshot.status.is_active())
    {
        return Err(ScanError::JobConflict(
            "已有扫描任务正在运行，请等待完成或取消后再试。".to_string(),
        ));
    }
    Ok(())
}

fn ensure_no_active_batches(
    batches: &Arc<Mutex<HashMap<String, ScanBatchRecord>>>,
) -> Result<(), ScanError> {
    let guard = batches
        .lock()
        .map_err(|_| ScanError::Permission("扫描批次状态锁定失败。".to_string()))?;
    if guard
        .values()
        .any(|existing| existing.snapshot.status.is_active())
    {
        return Err(ScanError::JobConflict(
            "已有扫描批次正在运行，请等待完成或取消后再试。".to_string(),
        ));
    }
    Ok(())
}

fn insert_scan_job(
    jobs: &Arc<Mutex<HashMap<String, ScanJobRecord>>>,
    job_id: String,
    record: ScanJobRecord,
) -> Result<(), ScanError> {
    let mut guard = jobs
        .lock()
        .map_err(|_| ScanError::Permission("扫描状态锁定失败。".to_string()))?;
    if guard
        .values()
        .any(|existing| existing.snapshot.status.is_active())
    {
        return Err(ScanError::JobConflict(
            "已有扫描任务正在运行，请等待完成或取消后再试。".to_string(),
        ));
    }

    prune_scan_jobs_locked(&mut guard);
    guard.insert(job_id, record);
    Ok(())
}

fn insert_scan_batch(
    batches: &Arc<Mutex<HashMap<String, ScanBatchRecord>>>,
    batch_id: String,
    record: ScanBatchRecord,
) -> Result<(), ScanError> {
    let mut guard = batches
        .lock()
        .map_err(|_| ScanError::Permission("扫描批次状态锁定失败。".to_string()))?;
    if guard
        .values()
        .any(|existing| existing.snapshot.status.is_active())
    {
        return Err(ScanError::JobConflict(
            "已有扫描批次正在运行，请等待完成或取消后再试。".to_string(),
        ));
    }
    guard.insert(batch_id, record);
    Ok(())
}

fn prune_scan_jobs_locked(jobs: &mut HashMap<String, ScanJobRecord>) {
    while jobs.len() >= MAX_RETAINED_SCAN_JOBS {
        let oldest_terminal = jobs
            .iter()
            .filter(|(_, record)| !record.snapshot.status.is_active())
            .min_by_key(|(_, record)| record.snapshot.updated_at_ms)
            .map(|(job_id, _)| job_id.clone());

        let Some(job_id) = oldest_terminal else {
            break;
        };
        jobs.remove(&job_id);
    }
}

fn run_scan_job_worker(
    app: tauri::AppHandle,
    jobs: Arc<Mutex<HashMap<String, ScanJobRecord>>>,
    job_id: String,
    selected_root: SelectedRoot,
    profile: ScanProfileDefinition,
    cancellation: ScanCancellation,
    resource_store_path: PathBuf,
) {
    let started_at_ms = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
        let cancellation_requested = cancellation.is_requested();
        snapshot.status = if cancellation_requested {
            ScanJobStatus::Cancelling
        } else {
            ScanJobStatus::Running
        };
        snapshot.updated_at_ms = current_time_ms();
        snapshot.progress.current_phase = if cancellation_requested {
            "cancelling"
        } else {
            "walking"
        };
        snapshot.progress.elapsed_ms = snapshot
            .updated_at_ms
            .saturating_sub(snapshot.started_at_ms);
        snapshot.progress.cancellation_requested = cancellation_requested;
        snapshot.started_at_ms
    })
    .map(|snapshot| snapshot.started_at_ms)
    .unwrap_or_else(|_| current_time_ms());
    emit_scan_job_progress(&app, &jobs, &job_id);

    let mut progress = ScanJobProgressHandle {
        app: app.clone(),
        jobs: Arc::clone(&jobs),
        job_id: job_id.clone(),
        cancellation: cancellation.clone(),
        started_at_ms,
        profile_id: profile.id,
        max_depth: profile.max_depth,
        max_entries: profile.max_entries,
        last_emitted_visited_entries: 0,
        batch_context: None,
    };

    match scan_validated_root_with_progress(&selected_root, &profile, Some(&mut progress)) {
        Ok(result) => {
            let completed_at_ms = current_time_ms();
            let persist_result = persist_completed_scan_result(
                &resource_store_path,
                &job_id,
                "start_custom_scan_job",
                started_at_ms,
                completed_at_ms,
                &selected_root,
                &profile,
                &result,
            );
            if let Err(error) = persist_result {
                let command_error = ScanCommandError::from(error);
                let _ = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
                    let failed_at_ms = current_time_ms();
                    snapshot.status = ScanJobStatus::Failed;
                    snapshot.updated_at_ms = failed_at_ms;
                    snapshot.completed_at_ms = Some(failed_at_ms);
                    snapshot.progress.current_phase = "failed";
                    snapshot.progress.elapsed_ms =
                        failed_at_ms.saturating_sub(snapshot.started_at_ms);
                    snapshot.result = None;
                    snapshot.error = Some(command_error);
                });
                emit_scan_job_progress(&app, &jobs, &job_id);
                return;
            }
            let _ = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
                snapshot.status = ScanJobStatus::Completed;
                snapshot.updated_at_ms = completed_at_ms;
                snapshot.completed_at_ms = Some(completed_at_ms);
                snapshot.progress = ScanProgress::from_counts(
                    profile.id,
                    &result.counts,
                    result.resources.len(),
                    snapshot.started_at_ms,
                    "completed",
                    false,
                    profile.max_depth,
                    profile.max_entries,
                );
                snapshot.result = Some(result);
                snapshot.error = None;
            });
            emit_scan_job_progress(&app, &jobs, &job_id);
        }
        Err(ScanError::Cancelled) => {
            let snapshot_after_cancel = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
                let completed_at_ms = current_time_ms();
                snapshot.status = ScanJobStatus::Cancelled;
                snapshot.updated_at_ms = completed_at_ms;
                snapshot.completed_at_ms = Some(completed_at_ms);
                snapshot.progress.current_phase = "cancelled";
                snapshot.progress.cancellation_requested = true;
                snapshot.progress.elapsed_ms =
                    completed_at_ms.saturating_sub(snapshot.started_at_ms);
                snapshot.result = None;
                snapshot.error = None;
            });
            if let Ok(snapshot) = snapshot_after_cancel.as_ref() {
                if let Err(error) =
                    persist_terminal_scan_snapshot(&resource_store_path, &selected_root, snapshot)
                {
                    let command_error = ScanCommandError::from(error);
                    let _ = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
                        snapshot.status = ScanJobStatus::Failed;
                        snapshot.updated_at_ms = current_time_ms();
                        snapshot.progress.current_phase = "failed";
                        snapshot.error = Some(command_error);
                    });
                }
            }
            emit_scan_job_progress(&app, &jobs, &job_id);
        }
        Err(error) => {
            let command_error = ScanCommandError::from(error);
            let snapshot_after_failure = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
                let completed_at_ms = current_time_ms();
                snapshot.status = ScanJobStatus::Failed;
                snapshot.updated_at_ms = completed_at_ms;
                snapshot.completed_at_ms = Some(completed_at_ms);
                snapshot.progress.current_phase = "failed";
                snapshot.progress.elapsed_ms =
                    completed_at_ms.saturating_sub(snapshot.started_at_ms);
                snapshot.result = None;
                snapshot.error = Some(command_error.clone());
            });
            if let Ok(snapshot) = snapshot_after_failure.as_ref() {
                if let Err(error) =
                    persist_terminal_scan_snapshot(&resource_store_path, &selected_root, snapshot)
                {
                    let store_error = ScanCommandError::from(error);
                    let _ = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
                        snapshot.updated_at_ms = current_time_ms();
                        snapshot.error = Some(store_error);
                    });
                }
            }
            emit_scan_job_progress(&app, &jobs, &job_id);
        }
    }
}

fn run_scan_batch_worker(
    app: tauri::AppHandle,
    jobs: Arc<Mutex<HashMap<String, ScanJobRecord>>>,
    batches: Arc<Mutex<HashMap<String, ScanBatchRecord>>>,
    batch_id: String,
    sources: Vec<resource_store::StoredScanSource>,
    cancellation: ScanCancellation,
    resource_store_path: PathBuf,
) {
    let _ = update_scan_batch_snapshot(&batches, &batch_id, |snapshot| {
        snapshot.status = ScanBatchStatus::Running;
        snapshot.updated_at_ms = current_time_ms();
        snapshot.progress.elapsed_ms = snapshot
            .updated_at_ms
            .saturating_sub(snapshot.started_at_ms);
    });

    for source in sources {
        if cancellation.is_requested() {
            let _ = update_scan_batch_source(&batches, &batch_id, &source.id, |source_snapshot| {
                source_snapshot.status = ScanBatchSourceStatus::Cancelled;
                source_snapshot.message = Some("批次已取消，未开始扫描。".to_string());
            });
            continue;
        }

        let job_id = make_scan_job_id();
        let started_at_ms = current_time_ms();
        let selected_root = match selected_root_from_stored_source(&source) {
            Ok(root) => root,
            Err(error) => {
                let command_error = ScanCommandError::from(error);
                persist_failed_batch_source_job(
                    &resource_store_path,
                    &source,
                    &job_id,
                    started_at_ms,
                    &command_error,
                );
                let _ = update_scan_batch_source(&batches, &batch_id, &source.id, |snapshot| {
                    snapshot.status = ScanBatchSourceStatus::Failed;
                    snapshot.job_id = Some(job_id.clone());
                    snapshot.error_count = 1;
                    snapshot.last_scanned_at_ms = Some(current_time_ms());
                    snapshot.message = Some(command_error.message.clone());
                });
                continue;
            }
        };
        let profile = match resolve_scan_profile(Some(&source.profile_id)) {
            Ok(profile) => profile,
            Err(error) => {
                let command_error = ScanCommandError::from(error);
                persist_failed_batch_source_job(
                    &resource_store_path,
                    &source,
                    &job_id,
                    started_at_ms,
                    &command_error,
                );
                let _ = update_scan_batch_source(&batches, &batch_id, &source.id, |snapshot| {
                    snapshot.status = ScanBatchSourceStatus::Failed;
                    snapshot.job_id = Some(job_id.clone());
                    snapshot.error_count = 1;
                    snapshot.last_scanned_at_ms = Some(current_time_ms());
                    snapshot.message = Some(command_error.message.clone());
                });
                continue;
            }
        };

        let progress = ScanProgress::from_counts(
            profile.id,
            &ScanCounts::default(),
            0,
            started_at_ms,
            "queued",
            false,
            profile.max_depth,
            profile.max_entries,
        );
        let job_snapshot = ScanJobSnapshot {
            job_id: job_id.clone(),
            status: ScanJobStatus::Queued,
            profile_id: profile.id,
            root_display_name: selected_root.display_name.clone(),
            root_summary: selected_root.root_summary.clone(),
            started_at_ms,
            updated_at_ms: started_at_ms,
            completed_at_ms: None,
            progress,
            result: None,
            error: None,
        };
        let job_record = ScanJobRecord {
            cancellation: cancellation.clone(),
            snapshot: job_snapshot,
        };
        if let Err(error) = insert_scan_job(&jobs, job_id.clone(), job_record) {
            let command_error = ScanCommandError::from(error);
            let _ = update_scan_batch_source(&batches, &batch_id, &source.id, |snapshot| {
                snapshot.status = ScanBatchSourceStatus::Failed;
                snapshot.job_id = Some(job_id.clone());
                snapshot.error_count = 1;
                snapshot.last_scanned_at_ms = Some(current_time_ms());
                snapshot.message = Some(command_error.message.clone());
            });
            continue;
        }

        let _ = update_scan_batch_source(&batches, &batch_id, &source.id, |snapshot| {
            snapshot.status = ScanBatchSourceStatus::Running;
            snapshot.job_id = Some(job_id.clone());
            snapshot.message = None;
        });
        let source_id = source.id.clone();
        let project_label = source.project_label.clone();
        let mut progress_handle = ScanJobProgressHandle {
            app: app.clone(),
            jobs: Arc::clone(&jobs),
            job_id: job_id.clone(),
            cancellation: cancellation.clone(),
            started_at_ms,
            profile_id: profile.id,
            max_depth: profile.max_depth,
            max_entries: profile.max_entries,
            last_emitted_visited_entries: 0,
            batch_context: Some(ScanBatchProgressContext {
                batches: Arc::clone(&batches),
                batch_id: batch_id.clone(),
                scan_source_id: source_id.clone(),
            }),
        };

        match scan_validated_root_with_progress(
            &selected_root,
            &profile,
            Some(&mut progress_handle),
        ) {
            Ok(result) => {
                let completed_at_ms = current_time_ms();
                let persist_result = persist_completed_scan_result_for_source(
                    &resource_store_path,
                    &job_id,
                    "start_scan_sources_batch",
                    started_at_ms,
                    completed_at_ms,
                    &selected_root,
                    &profile,
                    &result,
                    Some(&source_id),
                    project_label.as_deref(),
                );
                if let Err(error) = persist_result {
                    let command_error = ScanCommandError::from(error);
                    let _ = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
                        snapshot.status = ScanJobStatus::Failed;
                        snapshot.updated_at_ms = current_time_ms();
                        snapshot.completed_at_ms = Some(snapshot.updated_at_ms);
                        snapshot.progress.current_phase = "failed";
                        snapshot.error = Some(command_error.clone());
                    });
                    let _ = update_scan_batch_source(&batches, &batch_id, &source_id, |snapshot| {
                        snapshot.status = ScanBatchSourceStatus::Failed;
                        snapshot.error_count = 1;
                        snapshot.last_scanned_at_ms = Some(current_time_ms());
                        snapshot.message = Some(command_error.message.clone());
                    });
                    emit_scan_job_progress(&app, &jobs, &job_id);
                    continue;
                }
                let _ = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
                    snapshot.status = ScanJobStatus::Completed;
                    snapshot.updated_at_ms = completed_at_ms;
                    snapshot.completed_at_ms = Some(completed_at_ms);
                    snapshot.progress = ScanProgress::from_counts(
                        profile.id,
                        &result.counts,
                        result.resources.len(),
                        snapshot.started_at_ms,
                        "completed",
                        false,
                        profile.max_depth,
                        profile.max_entries,
                    );
                    snapshot.result = Some(result.clone());
                    snapshot.error = None;
                });
                let skipped_entries = count_skipped_entries(&result.counts);
                let _ = update_scan_batch_source(&batches, &batch_id, &source_id, |snapshot| {
                    snapshot.status = ScanBatchSourceStatus::Completed;
                    snapshot.resources_found = result.resources.len() as u64;
                    snapshot.skipped_entries = skipped_entries as u64;
                    snapshot.error_count =
                        error_inputs_from_warnings(&result.warnings).len() as u64;
                    snapshot.last_scanned_at_ms = Some(completed_at_ms);
                    snapshot.message = Some("扫描完成。".to_string());
                });
                emit_scan_job_progress(&app, &jobs, &job_id);
            }
            Err(ScanError::Cancelled) => {
                let snapshot_after_cancel = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
                    let completed_at_ms = current_time_ms();
                    snapshot.status = ScanJobStatus::Cancelled;
                    snapshot.updated_at_ms = completed_at_ms;
                    snapshot.completed_at_ms = Some(completed_at_ms);
                    snapshot.progress.current_phase = "cancelled";
                    snapshot.progress.cancellation_requested = true;
                    snapshot.progress.elapsed_ms =
                        completed_at_ms.saturating_sub(snapshot.started_at_ms);
                    snapshot.result = None;
                    snapshot.error = None;
                });
                if let Ok(snapshot) = snapshot_after_cancel.as_ref() {
                    let _ = persist_terminal_scan_snapshot_for_source(
                        &resource_store_path,
                        &selected_root,
                        snapshot,
                        Some(&source_id),
                        project_label.as_deref(),
                    );
                }
                let _ = update_scan_batch_source(&batches, &batch_id, &source_id, |snapshot| {
                    snapshot.status = ScanBatchSourceStatus::Cancelled;
                    snapshot.last_scanned_at_ms = Some(current_time_ms());
                    snapshot.message = Some("扫描已取消。".to_string());
                });
                emit_scan_job_progress(&app, &jobs, &job_id);
                break;
            }
            Err(error) => {
                let command_error = ScanCommandError::from(error);
                let snapshot_after_failure = update_scan_job_snapshot(&jobs, &job_id, |snapshot| {
                    let completed_at_ms = current_time_ms();
                    snapshot.status = ScanJobStatus::Failed;
                    snapshot.updated_at_ms = completed_at_ms;
                    snapshot.completed_at_ms = Some(completed_at_ms);
                    snapshot.progress.current_phase = "failed";
                    snapshot.progress.elapsed_ms =
                        completed_at_ms.saturating_sub(snapshot.started_at_ms);
                    snapshot.result = None;
                    snapshot.error = Some(command_error.clone());
                });
                if let Ok(snapshot) = snapshot_after_failure.as_ref() {
                    let _ = persist_terminal_scan_snapshot_for_source(
                        &resource_store_path,
                        &selected_root,
                        snapshot,
                        Some(&source_id),
                        project_label.as_deref(),
                    );
                }
                let _ = update_scan_batch_source(&batches, &batch_id, &source_id, |snapshot| {
                    snapshot.status = ScanBatchSourceStatus::Failed;
                    snapshot.error_count = 1;
                    snapshot.last_scanned_at_ms = Some(current_time_ms());
                    snapshot.message = Some(command_error.message.clone());
                });
                emit_scan_job_progress(&app, &jobs, &job_id);
            }
        }
    }

    let _ = update_scan_batch_snapshot(&batches, &batch_id, |snapshot| {
        if cancellation.is_requested() {
            for source in &mut snapshot.sources {
                if matches!(
                    source.status,
                    ScanBatchSourceStatus::Queued | ScanBatchSourceStatus::Idle
                ) {
                    source.status = ScanBatchSourceStatus::Cancelled;
                    source.message = Some("批次已取消，未开始扫描。".to_string());
                }
            }
        }
        recompute_batch_counters(snapshot);
        snapshot.status = if snapshot.cancelled_sources > 0
            && snapshot.completed_sources < snapshot.total_sources
        {
            ScanBatchStatus::Cancelled
        } else if snapshot.failed_sources > 0 {
            ScanBatchStatus::Failed
        } else if snapshot.cancelled_sources > 0 {
            ScanBatchStatus::Cancelled
        } else {
            ScanBatchStatus::Completed
        };
        snapshot.active_source_id = None;
        snapshot.updated_at_ms = current_time_ms();
        snapshot.completed_at_ms = Some(snapshot.updated_at_ms);
        snapshot.progress.elapsed_ms = snapshot
            .updated_at_ms
            .saturating_sub(snapshot.started_at_ms);
        snapshot.progress.cancellation_requested = cancellation.is_requested();
    });
}

fn update_scan_job_snapshot<F, R>(
    jobs: &Arc<Mutex<HashMap<String, ScanJobRecord>>>,
    job_id: &str,
    update: F,
) -> Result<ScanJobSnapshot, ScanError>
where
    F: FnOnce(&mut ScanJobSnapshot) -> R,
{
    let mut guard = jobs
        .lock()
        .map_err(|_| ScanError::Permission("扫描状态锁定失败。".to_string()))?;
    let record = guard
        .get_mut(job_id)
        .ok_or_else(|| ScanError::JobMissing("未找到扫描任务。".to_string()))?;
    update(&mut record.snapshot);
    Ok(record.snapshot.clone())
}

fn update_scan_batch_snapshot<F, R>(
    batches: &Arc<Mutex<HashMap<String, ScanBatchRecord>>>,
    batch_id: &str,
    update: F,
) -> Result<ScanBatchSnapshot, ScanError>
where
    F: FnOnce(&mut ScanBatchSnapshot) -> R,
{
    let mut guard = batches
        .lock()
        .map_err(|_| ScanError::Permission("扫描批次状态锁定失败。".to_string()))?;
    let record = guard
        .get_mut(batch_id)
        .ok_or_else(|| ScanError::BatchMissing("未找到扫描批次。".to_string()))?;
    update(&mut record.snapshot);
    recompute_batch_counters(&mut record.snapshot);
    Ok(record.snapshot.clone())
}

fn update_scan_batch_source<F, R>(
    batches: &Arc<Mutex<HashMap<String, ScanBatchRecord>>>,
    batch_id: &str,
    source_id: &str,
    update: F,
) -> Result<ScanBatchSnapshot, ScanError>
where
    F: FnOnce(&mut ScanBatchSourceSnapshot) -> R,
{
    update_scan_batch_snapshot(batches, batch_id, |snapshot| {
        snapshot.active_source_id = Some(source_id.to_string());
        snapshot.updated_at_ms = current_time_ms();
        snapshot.progress.elapsed_ms = snapshot
            .updated_at_ms
            .saturating_sub(snapshot.started_at_ms);
        if let Some(source) = snapshot
            .sources
            .iter_mut()
            .find(|source| source.scan_source_id == source_id)
        {
            update(source);
        }
    })
}

fn recompute_batch_counters(snapshot: &mut ScanBatchSnapshot) {
    snapshot.completed_sources = snapshot
        .sources
        .iter()
        .filter(|source| {
            matches!(
                source.status,
                ScanBatchSourceStatus::Completed
                    | ScanBatchSourceStatus::Cancelled
                    | ScanBatchSourceStatus::Failed
            )
        })
        .count();
    snapshot.cancelled_sources = snapshot
        .sources
        .iter()
        .filter(|source| source.status == ScanBatchSourceStatus::Cancelled)
        .count();
    snapshot.failed_sources = snapshot
        .sources
        .iter()
        .filter(|source| source.status == ScanBatchSourceStatus::Failed)
        .count();
    snapshot.progress.completed_sources = snapshot.completed_sources;
    snapshot.progress.total_sources = snapshot.total_sources;
}

fn emit_scan_job_progress(
    app: &tauri::AppHandle,
    jobs: &Arc<Mutex<HashMap<String, ScanJobRecord>>>,
    job_id: &str,
) {
    let snapshot = {
        let Ok(guard) = jobs.lock() else {
            return;
        };
        guard.get(job_id).map(|record| record.snapshot.clone())
    };
    let Some(snapshot) = snapshot else {
        return;
    };
    let payload = build_scan_job_event_payload(
        &snapshot.job_id,
        snapshot.status,
        snapshot.progress,
        snapshot.error,
    );
    let _ = app.emit(SCAN_JOB_PROGRESS_EVENT, payload);
}

fn persist_completed_scan_result(
    db_path: &Path,
    job_id: &str,
    requested_by: &str,
    started_at_ms: u64,
    finished_at_ms: u64,
    selected_root: &SelectedRoot,
    profile: &ScanProfileDefinition,
    result: &CustomScanResult,
) -> Result<(), ScanError> {
    persist_completed_scan_result_for_source(
        db_path,
        job_id,
        requested_by,
        started_at_ms,
        finished_at_ms,
        selected_root,
        profile,
        result,
        None,
        None,
    )
}

fn persist_completed_scan_result_for_source(
    db_path: &Path,
    job_id: &str,
    requested_by: &str,
    started_at_ms: u64,
    finished_at_ms: u64,
    selected_root: &SelectedRoot,
    profile: &ScanProfileDefinition,
    result: &CustomScanResult,
    source_id: Option<&str>,
    project_label: Option<&str>,
) -> Result<(), ScanError> {
    let skipped_entries = result.counts.skipped_by_exclude
        + result.counts.skipped_by_guard
        + result.counts.skipped_by_metadata_error
        + result.counts.skipped_by_limit
        + result.counts.skipped_by_cancellation
        + result.counts.skipped_by_size
        + result.counts.skipped_symlinks;
    let error_inputs = error_inputs_from_warnings(&result.warnings);
    let input = PersistScanJobInput {
        id: job_id.to_string(),
        status: "completed".to_string(),
        profile_id: profile.id.to_string(),
        started_at_ms,
        finished_at_ms: Some(finished_at_ms),
        elapsed_ms: finished_at_ms.saturating_sub(started_at_ms),
        requested_by: requested_by.to_string(),
        total_entries: result.counts.visited_entries as u64,
        matched_resources: result.resources.len() as u64,
        skipped_entries: skipped_entries as u64,
        error_count: error_inputs.len() as u64,
        cancelled: false,
        summary_json: completed_summary_json(result, profile, selected_root),
        source: scan_source_input(selected_root, profile, source_id, project_label),
        resources: result
            .resources
            .iter()
            .map(persist_resource_input)
            .collect(),
        skips: skip_inputs_from_counts(&result.counts, &result.warnings),
        errors: error_inputs,
    };

    resource_store::persist_scan_job_for_path(db_path, input).map_err(store_error_to_scan_error)
}

fn persist_terminal_scan_snapshot(
    db_path: &Path,
    selected_root: &SelectedRoot,
    snapshot: &ScanJobSnapshot,
) -> Result<(), ScanError> {
    persist_terminal_scan_snapshot_for_source(db_path, selected_root, snapshot, None, None)
}

fn persist_terminal_scan_snapshot_for_source(
    db_path: &Path,
    selected_root: &SelectedRoot,
    snapshot: &ScanJobSnapshot,
    source_id: Option<&str>,
    project_label: Option<&str>,
) -> Result<(), ScanError> {
    let profile = resolve_scan_profile(Some(snapshot.profile_id))?;
    let error_inputs = snapshot
        .error
        .as_ref()
        .map(|error| PersistScanErrorInput {
            error_kind: error.code.to_string(),
            message: error.message.clone(),
            sample_safe_path: None,
        })
        .into_iter()
        .collect::<Vec<_>>();
    let skips = if snapshot.status == ScanJobStatus::Cancelled {
        vec![PersistScanSkipInput {
            reason: "cancelled".to_string(),
            count: 1,
            sample_safe_path: None,
        }]
    } else {
        Vec::new()
    };

    let input = PersistScanJobInput {
        id: snapshot.job_id.clone(),
        status: scan_job_status_value(&snapshot.status).to_string(),
        profile_id: snapshot.profile_id.to_string(),
        started_at_ms: snapshot.started_at_ms,
        finished_at_ms: snapshot.completed_at_ms,
        elapsed_ms: snapshot.progress.elapsed_ms,
        requested_by: "start_custom_scan_job".to_string(),
        total_entries: snapshot.progress.visited_entries as u64,
        matched_resources: snapshot.progress.matched_resources as u64,
        skipped_entries: snapshot.progress.skipped_entries as u64,
        error_count: error_inputs.len() as u64,
        cancelled: snapshot.status == ScanJobStatus::Cancelled,
        summary_json: terminal_summary_json(snapshot, selected_root),
        source: scan_source_input(selected_root, &profile, source_id, project_label),
        resources: Vec::new(),
        skips,
        errors: error_inputs,
    };

    resource_store::persist_scan_job_for_path(db_path, input).map_err(store_error_to_scan_error)
}

fn scan_source_input(
    selected_root: &SelectedRoot,
    profile: &ScanProfileDefinition,
    source_id: Option<&str>,
    project_label: Option<&str>,
) -> PersistScanSourceInput {
    PersistScanSourceInput {
        id: source_id.map(ToString::to_string),
        display_name: selected_root.display_name.clone(),
        root_path: selected_root.canonical_root.to_string_lossy().to_string(),
        root_display_path: selected_root.root_summary.clone(),
        profile_id: profile.id.to_string(),
        source_kind: selected_root.source_kind.clone(),
        project_label: normalize_optional_label(project_label),
    }
}

fn persist_resource_input(resource: &ScanResource) -> PersistScanResourceInput {
    let manifest_metadata = resource.skill_manifest_metadata.as_ref();
    let name = manifest_metadata
        .and_then(|metadata| metadata.name.clone())
        .unwrap_or_else(|| display_name_for_relative_resource(&resource.relative_path));
    let description = manifest_metadata
        .and_then(|metadata| metadata.description.clone())
        .unwrap_or_else(|| resource.classification_reason.to_string());

    PersistScanResourceInput {
        name,
        resource_kind: resource.resource_kind.to_string(),
        description,
        primary_type: resource.entry_type.to_string(),
        risk_level: risk_level_for_scan_resource(resource).to_string(),
        boundary_labels: resource
            .boundary_labels
            .iter()
            .map(|label| (*label).to_string())
            .collect(),
        relative_path: resource.relative_path.clone(),
        display_path: resource.relative_path.clone(),
        extension: resource.extension.clone(),
        entry_type: resource.entry_type.to_string(),
        size_bytes: resource.size_bytes,
        modified_at_ms: resource.modified_at_ms,
        classification_reason: resource.classification_reason.to_string(),
        sensitive_path_redacted: resource.sensitive,
        risk_labels: resource
            .risk_labels
            .iter()
            .map(|label| (*label).to_string())
            .collect(),
    }
}

fn skip_inputs_from_counts(
    counts: &ScanCounts,
    warnings: &[ScanWarning],
) -> Vec<PersistScanSkipInput> {
    [
        (
            "excluded_directory",
            counts.skipped_by_exclude,
            None::<&[&str]>,
        ),
        (
            "protected_system_path",
            counts.skipped_by_guard,
            None::<&[&str]>,
        ),
        (
            "permission_denied",
            counts.denied_errors,
            Some(&["metadata_denied", "walk_error"][..]),
        ),
        (
            "metadata_error",
            counts
                .skipped_by_metadata_error
                .saturating_sub(counts.denied_errors),
            Some(&["metadata_denied", "walk_error"][..]),
        ),
        (
            "entry_limit",
            counts.skipped_by_limit,
            Some(&["max_entries_reached"][..]),
        ),
        (
            "depth_limit",
            counts.skipped_by_depth_limit,
            Some(&["max_depth_reached"][..]),
        ),
        ("cancelled", counts.skipped_by_cancellation, None::<&[&str]>),
        (
            "unsupported_root",
            counts.skipped_unsupported_roots,
            None::<&[&str]>,
        ),
        (
            "duplicate_source",
            counts.skipped_duplicate_sources,
            None::<&[&str]>,
        ),
        (
            "metadata_policy_skip",
            counts.skipped_by_size + counts.skipped_symlinks,
            Some(&["max_file_size_skipped", "symlink_skipped"][..]),
        ),
    ]
    .into_iter()
    .filter_map(|(reason, count, warning_codes)| {
        if count == 0 {
            return None;
        }
        Some(PersistScanSkipInput {
            reason: reason.to_string(),
            count: count as u64,
            sample_safe_path: warning_codes.and_then(|codes| sample_warning_path(warnings, codes)),
        })
    })
    .collect()
}

fn error_inputs_from_warnings(warnings: &[ScanWarning]) -> Vec<PersistScanErrorInput> {
    warnings
        .iter()
        .filter(|warning| matches!(warning.code, "metadata_denied" | "walk_error"))
        .map(|warning| PersistScanErrorInput {
            error_kind: warning.code.to_string(),
            message: warning.message.clone(),
            sample_safe_path: warning.relative_path.clone(),
        })
        .collect()
}

fn sample_warning_path(warnings: &[ScanWarning], codes: &[&str]) -> Option<String> {
    warnings
        .iter()
        .find(|warning| codes.contains(&warning.code))
        .and_then(|warning| warning.relative_path.clone())
}

fn completed_summary_json(
    result: &CustomScanResult,
    profile: &ScanProfileDefinition,
    selected_root: &SelectedRoot,
) -> String {
    serde_json::json!({
        "policyId": result.policy_id,
        "profileId": profile.id,
        "scanMode": selected_root.source_kind,
        "sourceKind": selected_root.source_kind,
        "userConfirmedMode": selected_root.user_confirmed_mode,
        "metadataOnly": true,
        "contentStored": false,
        "executionEnabled": false,
        "fullDiskScanEnabled": selected_root.source_kind == ADVANCED_FULL_DISK_SOURCE_KIND,
        "visitedEntries": result.counts.visited_entries,
        "matchedResources": result.resources.len(),
        "warningCount": result.warnings.len(),
        "truncated": result.counts.truncated
    })
    .to_string()
}

fn terminal_summary_json(snapshot: &ScanJobSnapshot, selected_root: &SelectedRoot) -> String {
    serde_json::json!({
        "profileId": snapshot.profile_id,
        "scanMode": selected_root.source_kind,
        "sourceKind": selected_root.source_kind,
        "userConfirmedMode": selected_root.user_confirmed_mode,
        "status": scan_job_status_value(&snapshot.status),
        "metadataOnly": true,
        "contentStored": false,
        "executionEnabled": false,
        "fullDiskScanEnabled": selected_root.source_kind == ADVANCED_FULL_DISK_SOURCE_KIND,
        "visitedEntries": snapshot.progress.visited_entries,
        "matchedResources": snapshot.progress.matched_resources,
        "skippedEntries": snapshot.progress.skipped_entries,
        "cancelled": snapshot.status == ScanJobStatus::Cancelled
    })
    .to_string()
}

fn scan_job_status_value(status: &ScanJobStatus) -> &'static str {
    match status {
        ScanJobStatus::Queued => "queued",
        ScanJobStatus::Running => "running",
        ScanJobStatus::Cancelling => "cancelling",
        ScanJobStatus::Completed => "completed",
        ScanJobStatus::Cancelled => "cancelled",
        ScanJobStatus::Failed => "failed",
    }
}

fn risk_level_for_scan_resource(resource: &ScanResource) -> &'static str {
    if resource.sensitive
        || matches!(
            resource.resource_kind,
            "script" | "validator" | "mcp-config"
        )
    {
        "medium"
    } else {
        "low"
    }
}

fn display_name_for_relative_resource(relative_path: &str) -> String {
    relative_path
        .split('/')
        .filter(|segment| !segment.trim().is_empty())
        .last()
        .unwrap_or(relative_path)
        .to_string()
}

fn store_error_to_scan_error(error: resource_store::ResourceStoreError) -> ScanError {
    let command_error = resource_store::ResourceStoreCommandError::from(error);
    ScanError::Store(command_error.message)
}

fn selected_root_from_stored_source(
    source: &resource_store::StoredScanSource,
) -> Result<SelectedRoot, ScanError> {
    let mode = resolve_scan_mode(&source.source_kind)?;
    let root = validate_scan_root_for_mode(Path::new(&source.root_path), &mode, true)?;
    Ok(SelectedRoot {
        selection_id: source.id.clone(),
        canonical_root: root.canonical_root,
        display_name: root.display_name,
        root_summary: root.root_summary,
        source_kind: source.source_kind.clone(),
        user_confirmed_mode: source.source_kind != ADVANCED_FULL_DISK_SOURCE_KIND
            || source.profile_id == ADVANCED_FULL_DISK_PROFILE_ID,
    })
}

fn persist_failed_batch_source_job(
    db_path: &Path,
    source: &resource_store::StoredScanSource,
    job_id: &str,
    started_at_ms: u64,
    error: &ScanCommandError,
) {
    let finished_at_ms = current_time_ms();
    let input = PersistScanJobInput {
        id: job_id.to_string(),
        status: "failed".to_string(),
        profile_id: source.profile_id.clone(),
        started_at_ms,
        finished_at_ms: Some(finished_at_ms),
        elapsed_ms: finished_at_ms.saturating_sub(started_at_ms),
        requested_by: "start_scan_sources_batch".to_string(),
        total_entries: 0,
        matched_resources: 0,
        skipped_entries: 0,
        error_count: 1,
        cancelled: false,
        summary_json: serde_json::json!({
            "profileId": source.profile_id.as_str(),
            "scanMode": source.source_kind.as_str(),
            "sourceKind": source.source_kind.as_str(),
            "userConfirmedMode": source.source_kind != ADVANCED_FULL_DISK_SOURCE_KIND || source.profile_id == ADVANCED_FULL_DISK_PROFILE_ID,
            "status": "failed",
            "metadataOnly": true,
            "contentStored": false,
            "executionEnabled": false,
            "fullDiskScanEnabled": source.source_kind == ADVANCED_FULL_DISK_SOURCE_KIND
        })
        .to_string(),
        source: PersistScanSourceInput {
            id: Some(source.id.clone()),
            display_name: source.display_name.clone(),
            root_path: source.root_path.clone(),
            root_display_path: source.root_display_path.clone(),
            profile_id: source.profile_id.clone(),
            source_kind: source.source_kind.clone(),
            project_label: source.project_label.clone(),
        },
        resources: Vec::new(),
        skips: Vec::new(),
        errors: vec![PersistScanErrorInput {
            error_kind: error.code.to_string(),
            message: error.message.clone(),
            sample_safe_path: None,
        }],
    };
    let _ = resource_store::persist_scan_job_for_path(db_path, input);
}

fn count_skipped_entries(counts: &ScanCounts) -> usize {
    counts.skipped_by_exclude
        + counts.skipped_by_guard
        + counts.skipped_by_metadata_error
        + counts.skipped_by_limit
        + counts.skipped_by_cancellation
        + counts.skipped_by_size
        + counts.skipped_symlinks
}

fn normalize_optional_label(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

struct ScanJobProgressHandle {
    app: tauri::AppHandle,
    jobs: Arc<Mutex<HashMap<String, ScanJobRecord>>>,
    job_id: String,
    cancellation: ScanCancellation,
    started_at_ms: u64,
    profile_id: &'static str,
    max_depth: usize,
    max_entries: usize,
    last_emitted_visited_entries: usize,
    batch_context: Option<ScanBatchProgressContext>,
}

#[derive(Clone)]
struct ScanBatchProgressContext {
    batches: Arc<Mutex<HashMap<String, ScanBatchRecord>>>,
    batch_id: String,
    scan_source_id: String,
}

impl ScanJobProgressHandle {
    fn is_cancelled(&self) -> bool {
        self.cancellation.is_requested()
    }

    fn publish(
        &mut self,
        counts: &ScanCounts,
        matched_resources: usize,
        current_phase: &'static str,
        force: bool,
    ) {
        let should_emit = force
            || counts.visited_entries == 0
            || counts
                .visited_entries
                .saturating_sub(self.last_emitted_visited_entries)
                >= 32;
        if !should_emit {
            return;
        }

        self.last_emitted_visited_entries = counts.visited_entries;
        let progress = ScanProgress::from_counts(
            self.profile_id,
            counts,
            matched_resources,
            self.started_at_ms,
            current_phase,
            self.is_cancelled(),
            self.max_depth,
            self.max_entries,
        );
        let _ = update_scan_job_snapshot(&self.jobs, &self.job_id, |snapshot| {
            if !matches!(snapshot.status, ScanJobStatus::Cancelling) {
                snapshot.status = ScanJobStatus::Running;
            }
            snapshot.updated_at_ms = current_time_ms();
            snapshot.progress = progress;
        });
        if let Some(context) = &self.batch_context {
            let _ = update_scan_batch_snapshot(&context.batches, &context.batch_id, |snapshot| {
                snapshot.updated_at_ms = current_time_ms();
                snapshot.progress.active_visited_entries = counts.visited_entries;
                snapshot.progress.active_matched_resources = matched_resources;
                snapshot.progress.active_skipped_entries = ScanProgress::from_counts(
                    self.profile_id,
                    counts,
                    matched_resources,
                    self.started_at_ms,
                    current_phase,
                    self.is_cancelled(),
                    self.max_depth,
                    self.max_entries,
                )
                .skipped_entries;
                snapshot.progress.elapsed_ms = snapshot
                    .updated_at_ms
                    .saturating_sub(snapshot.started_at_ms);
                snapshot.progress.cancellation_requested = self.is_cancelled();
                if let Some(source) = snapshot
                    .sources
                    .iter_mut()
                    .find(|source| source.scan_source_id == context.scan_source_id)
                {
                    source.status = if self.is_cancelled() {
                        ScanBatchSourceStatus::Running
                    } else {
                        ScanBatchSourceStatus::Running
                    };
                    source.resources_found = matched_resources as u64;
                    source.skipped_entries = snapshot.progress.active_skipped_entries as u64;
                }
            });
        }
        emit_scan_job_progress(&self.app, &self.jobs, &self.job_id);
    }
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

fn validate_scan_root_for_mode(
    path: &Path,
    mode: &ScanMode,
    advanced_confirmation_accepted: bool,
) -> Result<ValidatedRoot, ScanError> {
    match mode {
        ScanMode::CustomDirectory | ScanMode::IntelligentDiscovery => {
            validate_scan_root_internal(path)
        }
        ScanMode::AdvancedFullDisk => {
            if !advanced_confirmation_accepted {
                return Err(ScanError::AdvancedConfirmationRequired);
            }
            validate_advanced_scan_root_internal(path)
        }
    }
}

fn validate_advanced_scan_root_internal(path: &Path) -> Result<ValidatedRoot, ScanError> {
    if path.as_os_str().is_empty() {
        return Err(ScanError::InvalidPath("选择目录为空。".to_string()));
    }

    let symlink_metadata = fs::symlink_metadata(path)
        .map_err(|error| ScanError::InvalidPath(format!("无法读取目录元数据：{error}")))?;
    if symlink_metadata.file_type().is_symlink() {
        return Err(ScanError::RejectedRoot(
            "高级发现不允许选择符号链接目录。".to_string(),
        ));
    }
    if !symlink_metadata.is_dir() {
        return Err(ScanError::InvalidPath("只能扫描目录。".to_string()));
    }

    let canonical_root = fs::canonicalize(path)
        .map_err(|error| ScanError::InvalidPath(format!("无法规范化目录：{error}")))?;
    if is_protected_system_path(&canonical_root) && !is_allowed_advanced_broad_root(&canonical_root)
    {
        return Err(ScanError::RejectedRoot(
            "高级发现不会直接以受保护系统目录作为扫描根。".to_string(),
        ));
    }

    Ok(ValidatedRoot {
        display_name: display_name_for_path(&canonical_root),
        root_summary: summarize_root(&canonical_root),
        canonical_root,
    })
}

fn resolve_discovery_scan_roots(
    mode: &ScanMode,
    advanced_confirmation_accepted: bool,
) -> Result<Vec<ValidatedRoot>, ScanError> {
    let home = home_dir().ok_or_else(|| {
        ScanError::InvalidPath("无法定位当前用户 home 目录，不能创建发现扫描来源。".to_string())
    })?;
    let roots = discovery_candidate_roots_for_home(&home, mode)?
        .into_iter()
        .filter_map(|path| {
            validate_scan_root_for_mode(&path, mode, advanced_confirmation_accepted).ok()
        })
        .collect::<Vec<_>>();
    Ok(roots)
}

fn discovery_candidate_roots_for_home(
    home: &Path,
    mode: &ScanMode,
) -> Result<Vec<PathBuf>, ScanError> {
    if matches!(mode, ScanMode::CustomDirectory) {
        return Ok(Vec::new());
    }

    if matches!(mode, ScanMode::AdvancedFullDisk) {
        return Ok(vec![home.to_path_buf()]);
    }

    let mut candidates = Vec::new();
    for relative in [
        "Desktop",
        "Documents",
        "Downloads",
        "Developer",
        "Work",
        "Projects",
        "Code",
        "Workspace",
        ".ai/AIOS",
        ".ai/skill-modules",
    ] {
        let candidate = home.join(relative);
        if candidate.is_dir() && !is_broad_or_system_root(&candidate) && !is_home_root(&candidate) {
            candidates.push(candidate);
        }
    }

    Ok(candidates)
}

fn scan_validated_root(
    selected_root: &SelectedRoot,
    profile: &ScanProfileDefinition,
) -> Result<CustomScanResult, ScanError> {
    scan_validated_root_with_progress(selected_root, profile, None)
}

fn scan_validated_root_with_progress(
    selected_root: &SelectedRoot,
    profile: &ScanProfileDefinition,
    mut progress_handle: Option<&mut ScanJobProgressHandle>,
) -> Result<CustomScanResult, ScanError> {
    let policy = scanner_policy();
    let scan_mode = resolve_scan_mode(&selected_root.source_kind)?;
    let excluded_names_for_filter = excluded_names_for_scan_mode(&scan_mode);
    let excluded_names_for_loop = excluded_names_for_scan_mode(&scan_mode);
    let mut counts = ScanCounts::default();
    let mut resources = Vec::new();
    let mut warnings = Vec::new();
    let skipped_by_filter = Arc::new(AtomicUsize::new(0));

    let mut builder = WalkBuilder::new(&selected_root.canonical_root);
    builder
        .max_depth(Some(profile.max_depth))
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

    if let Some(handle) = progress_handle.as_deref_mut() {
        handle.publish(&counts, resources.len(), "walking", true);
    }

    for entry in builder.build() {
        if let Some(handle) = progress_handle.as_deref_mut() {
            if handle.is_cancelled() {
                counts.skipped_by_cancellation += 1;
                handle.publish(&counts, resources.len(), "cancelled", true);
                return Err(ScanError::Cancelled);
            }
        }

        if counts.visited_entries >= profile.max_entries {
            counts.truncated = true;
            counts.skipped_by_limit += 1;
            warnings.push(ScanWarning {
                code: "max_entries_reached",
                message: format!(
                    "扫描达到 {} 项上限，后续条目已停止遍历。",
                    profile.max_entries
                ),
                relative_path: None,
            });
            break;
        }

        let entry = match entry {
            Ok(entry) => entry,
            Err(_error) => {
                counts.denied_errors += 1;
                counts.skipped_by_metadata_error += 1;
                warnings.push(ScanWarning {
                    code: "walk_error",
                    message: "目录遍历跳过一个条目，原因未展开以避免暴露本地路径。".to_string(),
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
            if let Some(handle) = progress_handle.as_deref_mut() {
                handle.publish(&counts, resources.len(), "walking", false);
            }
            continue;
        }

        let metadata = match fs::symlink_metadata(path) {
            Ok(metadata) => metadata,
            Err(_error) => {
                counts.denied_errors += 1;
                counts.skipped_by_metadata_error += 1;
                warnings.push(ScanWarning {
                    code: "metadata_denied",
                    message: "无法读取条目元数据，已按策略跳过。".to_string(),
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
            if let Some(handle) = progress_handle.as_deref_mut() {
                handle.publish(&counts, resources.len(), "walking", false);
            }
            continue;
        }

        let entry_type = if metadata.is_dir() {
            "directory"
        } else if metadata.is_file() {
            "file"
        } else {
            "other"
        };

        if metadata.is_dir() && entry.depth() >= profile.max_depth {
            counts.skipped_by_depth_limit += 1;
            warnings.push(ScanWarning {
                code: "max_depth_reached",
                message: format!(
                    "目录达到 {} 层深度上限，后代条目未继续遍历。",
                    profile.max_depth
                ),
                relative_path: None,
            });
            if let Some(handle) = progress_handle.as_deref_mut() {
                handle.publish(&counts, resources.len(), "walking", false);
            }
            continue;
        }

        if metadata.is_file() && metadata.len() > policy.max_file_size_bytes {
            counts.skipped_by_size += 1;
            warnings.push(ScanWarning {
                code: "max_file_size_skipped",
                message: format!("文件超过 {} 字节元数据阈值。", policy.max_file_size_bytes),
                relative_path: Some(redact_relative_path(relative)),
            });
            if let Some(handle) = progress_handle.as_deref_mut() {
                handle.publish(&counts, resources.len(), "walking", false);
            }
            continue;
        }

        let (resource_kind, classification_reason) = classify_resource(relative);
        let skill_manifest_metadata =
            if metadata.is_file() && resource_kind == "skill" && is_skill_manifest_path(relative) {
                read_bounded_skill_manifest_metadata(path)
            } else {
                None
            };
        let redacted_relative = redact_relative_path(relative);
        let sensitive = path_has_sensitive_segment(relative);
        let skill_manifest_metadata_read = skill_manifest_metadata.is_some();

        resources.push(ScanResource {
            id: format!("custom-scan:{resource_kind}:{redacted_relative}"),
            relative_path: redacted_relative,
            entry_type,
            extension: extension_for_path(relative),
            size_bytes: metadata.is_file().then_some(metadata.len()),
            modified_at_ms: modified_at_ms(&metadata),
            resource_kind,
            risk_labels: risk_labels_for(resource_kind, sensitive),
            boundary_labels: boundary_labels_for(
                resource_kind,
                sensitive,
                skill_manifest_metadata_read,
            ),
            classification_reason,
            sensitive,
            skill_manifest_metadata,
        });

        if let Some(handle) = progress_handle.as_deref_mut() {
            handle.publish(&counts, resources.len(), "walking", false);
        }
    }

    counts.skipped_by_exclude += skipped_by_filter.load(Ordering::Relaxed);
    counts.returned_resources = resources.len();

    if let Some(handle) = progress_handle.as_deref_mut() {
        handle.publish(&counts, resources.len(), "finalizing", true);
    }

    Ok(CustomScanResult {
        policy_id: POLICY_ID,
        profile: profile.clone(),
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
        default_profile_id: DEFAULT_SCAN_PROFILE_ID,
        metadata_only: true,
        content_reading_enabled: false,
        execution_enabled: false,
        full_disk_scan_enabled: true,
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
        profile_ids: scan_profiles()
            .iter()
            .map(|profile| profile.id)
            .collect::<Vec<_>>(),
    }
}

fn excluded_names_for_scan_mode(mode: &ScanMode) -> HashSet<&'static str> {
    let mut excluded_names = scanner_policy()
        .excluded_names
        .into_iter()
        .collect::<HashSet<_>>();

    if matches!(
        mode,
        ScanMode::IntelligentDiscovery | ScanMode::AdvancedFullDisk
    ) {
        for name in [".ssh", ".gnupg", ".kube", "keychains", "cookies"] {
            excluded_names.insert(name);
        }
    }

    if matches!(mode, ScanMode::AdvancedFullDisk) {
        for name in [
            "library",
            "system",
            "applications",
            "volumes",
            "windows",
            "program files",
            "program files (x86)",
            "programdata",
        ] {
            excluded_names.insert(name);
        }
    }

    excluded_names
}

fn scan_profiles() -> Vec<ScanProfileDefinition> {
    vec![
        ScanProfileDefinition {
            id: DEFAULT_SCAN_PROFILE_ID,
            display_name: "通用自选目录",
            short_description: "适合先用一个普通文件夹试扫，观察 AIOS 如何只按元数据归类。",
            recommended_use_case: "不确定目录类型时使用；先选择一个小而明确的工作文件夹。",
            safety_boundary: "仅扫描用户通过系统目录选择器授权的单个目录，不读取内容、不执行脚本、不跟随符号链接。",
            example_folder_types: vec!["临时工作目录", "导出的本地资源包", "单个待审文件夹"],
            max_depth: 6,
            max_entries: 2_000,
            max_depth_entry_policy: "最多 6 层、2,000 个条目；达到上限后停止并给出提示。",
            exclude_policy_summary: "继承 Phase 2A 强 exclude：依赖目录、缓存、构建产物、日志、临时目录和工具缓存默认跳过。",
            classification_emphasis: vec!["通用资源识别", "敏感路径隐藏", "未知资源保守归类"],
            emphasized_resource_kinds: vec![
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
            result_group_label: "通用分类",
            metadata_only: true,
            content_reading_enabled: false,
            execution_enabled: false,
            full_disk_scan_enabled: false,
        },
        ScanProfileDefinition {
            id: "project-root",
            display_name: "项目根目录",
            short_description: "适合选择一个代码仓库或产品项目根目录，查看项目内 AI 相关入口。",
            recommended_use_case: "选择包含 package.json、Cargo.toml、docs、scripts 或 repo-local skills 的项目文件夹。",
            safety_boundary: "模板只改变归类重点；仍必须手动选择目录，且不会运行 build/test/lint 或 package scripts。",
            example_folder_types: vec!["代码仓库根目录", "含 manifest 的应用项目", "项目内 .agents/skills 子目录"],
            max_depth: 6,
            max_entries: 2_000,
            max_depth_entry_policy: "最多 6 层、2,000 个条目；适合中小型项目根目录的元数据视图。",
            exclude_policy_summary: "尊重 ignore 文件，并跳过依赖、构建、覆盖率、缓存和临时目录。",
            classification_emphasis: vec!["项目 manifest", "repo-local skills/prompts", "脚本与验证器", "docs/reports"],
            emphasized_resource_kinds: vec![
                "package-manifest",
                "skill",
                "prompt",
                "script",
                "validator",
                "report-doc",
                "policy-governance",
                "project-pack",
            ],
            result_group_label: "项目资源分类",
            metadata_only: true,
            content_reading_enabled: false,
            execution_enabled: false,
            full_disk_scan_enabled: false,
        },
        ScanProfileDefinition {
            id: "ai-toolchain",
            display_name: "AI 工具链目录",
            short_description: "适合审视用户明确选择的 AI 工具链配置副本或局部工具目录。",
            recommended_use_case: "选择一个小范围工具链工作目录、插件元数据目录或 prompts/skills 子目录。",
            safety_boundary: "不会自动扫描 ~/.codex、~/.claude、~/.ai 或 home；不会读取 auth/session/token/env 值或启动 MCP。",
            example_folder_types: vec!["工具链配置工作副本", "插件元数据目录", "工具 prompts/skills 子目录"],
            max_depth: 5,
            max_entries: 1_500,
            max_depth_entry_policy: "最多 5 层、1,500 个条目；工具链模板默认更保守。",
            exclude_policy_summary: "继承强 exclude，并将 credential/auth/session/cookie/key/token 样式路径段隐藏为 [sensitive]。",
            classification_emphasis: vec!["MCP/config 元数据", "技能入口", "提示词入口", "策略边界"],
            emphasized_resource_kinds: vec![
                "mcp-config",
                "skill",
                "prompt",
                "policy-governance",
                "script",
                "validator",
            ],
            result_group_label: "工具链元数据分类",
            metadata_only: true,
            content_reading_enabled: false,
            execution_enabled: false,
            full_disk_scan_enabled: false,
        },
        ScanProfileDefinition {
            id: "skills-prompts-workspace",
            display_name: "技能 / 提示词工作区",
            short_description: "适合选择 skills、prompts 或二者混合的工作目录。",
            recommended_use_case: "选择一个明确的 skills/prompts 文件夹，检查 AIOS 如何区分技能、提示词和验证边界。",
            safety_boundary: "仅按路径、扩展名、大小、修改时间和文件名归类；不会读取 SKILL.md 或 prompt 正文。",
            example_folder_types: vec!["skills 目录", "prompts 目录", "项目内技能工作区"],
            max_depth: 6,
            max_entries: 1_500,
            max_depth_entry_policy: "最多 6 层、1,500 个条目；适合中等规模技能/提示词目录。",
            exclude_policy_summary: "跳过依赖、缓存、构建产物和虚拟环境目录；敏感命名路径段仍会隐藏。",
            classification_emphasis: vec!["技能", "提示词", "验证器", "策略说明"],
            emphasized_resource_kinds: vec![
                "skill",
                "prompt",
                "validator",
                "policy-governance",
                "unknown-local-resource",
            ],
            result_group_label: "技能提示词分类",
            metadata_only: true,
            content_reading_enabled: false,
            execution_enabled: false,
            full_disk_scan_enabled: false,
        },
        ScanProfileDefinition {
            id: "docs-reports-workspace",
            display_name: "文档 / 报告工作区",
            short_description: "适合选择 docs、reports 或交付物目录，整理只读报告与治理材料元数据。",
            recommended_use_case: "选择一个项目文档、报告归档或策略材料目录。",
            safety_boundary: "不会读取文档正文；只展示路径、扩展名、大小、mtime 和保守分类原因。",
            example_folder_types: vec!["docs 目录", "reports 目录", "策略与交付物归档"],
            max_depth: 5,
            max_entries: 1_500,
            max_depth_entry_policy: "最多 5 层、1,500 个条目；偏向文档归档的浅层元数据视图。",
            exclude_policy_summary: "跳过缓存、构建产物、日志和临时目录；敏感命名路径段仍会隐藏。",
            classification_emphasis: vec!["报告与文档", "策略治理", "项目资源包"],
            emphasized_resource_kinds: vec![
                "report-doc",
                "policy-governance",
                "project-pack",
                "package-manifest",
                "unknown-local-resource",
            ],
            result_group_label: "文档报告分类",
            metadata_only: true,
            content_reading_enabled: false,
            execution_enabled: false,
            full_disk_scan_enabled: false,
        },
        ScanProfileDefinition {
            id: "aios-workspace",
            display_name: "AIOS 工作区",
            short_description: "适合选择一个 AIOS 相关工作区或本仓库内局部目录，查看桌面资源边界。",
            recommended_use_case: "选择 AIOS 应用仓库、报告/脚本工作区或 repo-local skill module 目录。",
            safety_boundary: "不会自动扫描 ~/.ai 或任何全局根；只扫描用户本次明确选择的文件夹。",
            example_folder_types: vec!["AIOS 应用仓库", "AIOS 报告/脚本工作区", "repo-local skill modules"],
            max_depth: 6,
            max_entries: 2_000,
            max_depth_entry_policy: "最多 6 层、2,000 个条目；与 Phase 2A MVP 上限一致。",
            exclude_policy_summary: "继承强 exclude；不会写回生成视图、全局技能入口或治理文件。",
            classification_emphasis: vec!["AIOS skills/prompts", "报告与脚本", "策略治理", "验证器"],
            emphasized_resource_kinds: vec![
                "skill",
                "prompt",
                "script",
                "report-doc",
                "project-pack",
                "policy-governance",
                "validator",
                "package-manifest",
            ],
            result_group_label: "AIOS 工作区分类",
            metadata_only: true,
            content_reading_enabled: false,
            execution_enabled: false,
            full_disk_scan_enabled: false,
        },
        ScanProfileDefinition {
            id: INTELLIGENT_DISCOVERY_PROFILE_ID,
            display_name: "智能全机发现",
            short_description: "面向非技术用户的引导式发现，只从常见用户工作区候选目录创建来源。",
            recommended_use_case: "用户点击开始后解析 Desktop、Documents、Downloads、Developer、Work、Projects 和 AIOS 工作区候选目录。",
            safety_boundary: "不会扫描系统根、home 根、/Users、/Volumes 或磁盘根；候选目录不存在或不可访问时安全跳过。",
            example_folder_types: vec!["Desktop", "Documents", "Downloads", "Developer", "Work", "Projects", "AIOS 工作区"],
            max_depth: 5,
            max_entries: 1_500,
            max_depth_entry_policy: "每个候选来源最多 5 层、1,500 个条目；候选来源按批次顺序扫描，可取消。",
            exclude_policy_summary: "继承强 exclude，并额外跳过 SSH/GPG/Kube、Keychains、Cookies 等敏感配置目录。",
            classification_emphasis: vec!["项目工作区", "AI 资源入口", "文档报告", "脚本与验证器"],
            emphasized_resource_kinds: vec![
                "package-manifest",
                "skill",
                "prompt",
                "mcp-config",
                "script",
                "validator",
                "report-doc",
                "project-pack",
                "policy-governance",
            ],
            result_group_label: "智能发现分类",
            metadata_only: true,
            content_reading_enabled: false,
            execution_enabled: false,
            full_disk_scan_enabled: false,
        },
        ScanProfileDefinition {
            id: ADVANCED_FULL_DISK_PROFILE_ID,
            display_name: "高级全盘发现",
            short_description: "高风险高级模式，只在用户勾选确认后创建 broad discovery 来源。",
            recommended_use_case: "仅在普通目录和智能发现无法定位资源时使用；受保护目录和权限失败会被跳过。",
            safety_boundary: "必须显式确认；仅保存元数据，不读取内容、不执行脚本/MCP、不跟随符号链接，并使用更强 exclude。",
            example_folder_types: vec!["用户 home 根", "受限 broad discovery 来源"],
            max_depth: 5,
            max_entries: 3_000,
            max_depth_entry_policy: "高级模式每个来源最多 5 层、3,000 个条目；达到上限即停止并记录跳过摘要。",
            exclude_policy_summary: "除依赖、缓存和构建产物外，额外跳过 Library、System、Applications、Volumes、SSH/GPG/Kube、Keychains、Cookies 等目录。",
            classification_emphasis: vec!["保守资源发现", "权限跳过统计", "敏感路径隐藏", "本地库可删除"],
            emphasized_resource_kinds: vec![
                "skill",
                "prompt",
                "mcp-config",
                "script",
                "validator",
                "report-doc",
                "project-pack",
                "policy-governance",
                "package-manifest",
                "unknown-local-resource",
            ],
            result_group_label: "高级发现分类",
            metadata_only: true,
            content_reading_enabled: false,
            execution_enabled: false,
            full_disk_scan_enabled: true,
        },
    ]
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

fn is_skill_manifest_path(path: &Path) -> bool {
    path.file_name()
        .and_then(|value| value.to_str())
        .is_some_and(|file_name| file_name.eq_ignore_ascii_case("SKILL.md"))
}

fn read_bounded_skill_manifest_metadata(path: &Path) -> Option<SkillManifestMetadata> {
    let metadata = fs::symlink_metadata(path).ok()?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return None;
    }

    let file = fs::File::open(path).ok()?;
    let mut buffer = Vec::with_capacity(MAX_SKILL_MANIFEST_METADATA_BYTES);
    file.take(MAX_SKILL_MANIFEST_METADATA_BYTES as u64)
        .read_to_end(&mut buffer)
        .ok()?;
    let text = String::from_utf8_lossy(&buffer);
    parse_bounded_skill_manifest_metadata(&text)
}

fn parse_bounded_skill_manifest_metadata(text: &str) -> Option<SkillManifestMetadata> {
    let frontmatter = extract_skill_frontmatter(text);
    let frontmatter_values = frontmatter
        .as_ref()
        .map(parse_skill_frontmatter_values)
        .unwrap_or_default();
    let heading = first_markdown_heading(text);
    let paragraph_start_line = heading
        .as_ref()
        .map(|heading| heading.next_line_index)
        .unwrap_or_else(|| {
            frontmatter
                .as_ref()
                .map(|frontmatter| frontmatter.next_line_index)
                .unwrap_or(0)
        });

    let name = frontmatter_values
        .name
        .or_else(|| heading.and_then(|heading| sanitize_skill_manifest_name(&heading.value)));
    let description = frontmatter_values.description.or_else(|| {
        if frontmatter.is_none() {
            first_safe_markdown_paragraph(text, paragraph_start_line)
        } else {
            None
        }
    });

    if name.is_none() && description.is_none() {
        None
    } else {
        Some(SkillManifestMetadata { name, description })
    }
}

#[derive(Clone, Debug)]
struct ExtractedFrontmatter {
    text: String,
    next_line_index: usize,
}

#[derive(Clone, Debug)]
struct MarkdownHeading {
    value: String,
    next_line_index: usize,
}

#[derive(Default)]
struct ParsedSkillFrontmatterValues {
    name: Option<String>,
    description: Option<String>,
}

fn extract_skill_frontmatter(text: &str) -> Option<ExtractedFrontmatter> {
    let lines = text.lines().collect::<Vec<_>>();
    if lines.first().map(|line| line.trim()) != Some("---") {
        return None;
    }

    for (index, line) in lines.iter().enumerate().skip(1) {
        if line.trim() == "---" {
            return Some(ExtractedFrontmatter {
                text: lines[1..index].join("\n"),
                next_line_index: index + 1,
            });
        }
    }

    None
}

fn parse_skill_frontmatter_values(
    frontmatter: &ExtractedFrontmatter,
) -> ParsedSkillFrontmatterValues {
    let mut values = ParsedSkillFrontmatterValues::default();

    for line in frontmatter.text.lines() {
        let Some((raw_key, raw_value)) = line.split_once(':') else {
            continue;
        };
        let key = raw_key.trim();
        let value = raw_value.trim();
        if value.is_empty() || value == "|" || value == ">" {
            continue;
        }

        match key {
            "name" => {
                if values.name.is_none() {
                    values.name = sanitize_skill_manifest_name(value);
                }
            }
            "description" => {
                if values.description.is_none() {
                    values.description = sanitize_skill_manifest_description(value);
                }
            }
            _ => {}
        }
    }

    values
}

fn first_markdown_heading(text: &str) -> Option<MarkdownHeading> {
    let mut in_code_block = false;
    for (index, line) in text.lines().enumerate() {
        let trimmed = line.trim();
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            in_code_block = !in_code_block;
            continue;
        }
        if in_code_block {
            continue;
        }
        if let Some(value) = trimmed.strip_prefix("# ") {
            let value = value.trim();
            if !value.is_empty() {
                return Some(MarkdownHeading {
                    value: value.to_string(),
                    next_line_index: index + 1,
                });
            }
        }
    }
    None
}

fn first_safe_markdown_paragraph(text: &str, start_line_index: usize) -> Option<String> {
    let mut paragraph = Vec::new();
    let mut in_code_block = false;

    for line in text.lines().skip(start_line_index) {
        let trimmed = line.trim();
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            if !paragraph.is_empty() {
                break;
            }
            in_code_block = !in_code_block;
            continue;
        }
        if in_code_block {
            continue;
        }
        if trimmed.is_empty() {
            if paragraph.is_empty() {
                continue;
            }
            break;
        }
        if trimmed == "---" {
            continue;
        }
        if trimmed.starts_with('#')
            || trimmed.starts_with('>')
            || trimmed.starts_with("- ")
            || trimmed.starts_with("* ")
            || trimmed.starts_with("+ ")
        {
            if paragraph.is_empty() {
                continue;
            }
            break;
        }

        paragraph.push(trimmed);
    }

    if paragraph.is_empty() {
        None
    } else {
        sanitize_skill_manifest_description(&paragraph.join(" "))
    }
}

fn sanitize_skill_manifest_name(value: &str) -> Option<String> {
    sanitize_skill_manifest_text(value, MAX_SKILL_MANIFEST_NAME_CHARS)
}

fn sanitize_skill_manifest_description(value: &str) -> Option<String> {
    sanitize_skill_manifest_text(value, MAX_SKILL_MANIFEST_DESCRIPTION_CHARS)
}

fn sanitize_skill_manifest_text(value: &str, max_chars: usize) -> Option<String> {
    let normalized = collapse_skill_manifest_whitespace(strip_skill_manifest_quotes(value));
    if normalized.is_empty() || contains_unsafe_skill_manifest_text(&normalized) {
        return None;
    }

    Some(truncate_skill_manifest_text(&normalized, max_chars))
}

fn strip_skill_manifest_quotes(value: &str) -> &str {
    value
        .trim()
        .trim_matches(|character| matches!(character, '"' | '\''))
}

fn collapse_skill_manifest_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn truncate_skill_manifest_text(value: &str, max_chars: usize) -> String {
    let mut output = value.chars().take(max_chars).collect::<String>();
    if value.chars().count() > max_chars {
        output.push_str("...");
    }
    output
}

fn contains_unsafe_skill_manifest_text(value: &str) -> bool {
    contains_secret_like_manifest_text(value)
        || contains_code_or_command_manifest_text(value)
        || contains_log_like_manifest_text(value)
        || contains_env_assignment_manifest_text(value)
}

fn contains_secret_like_manifest_text(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    lower.contains("-----begin") && lower.contains("private key")
        || lower.contains("authorization: bearer")
        || lower.contains("bearer sk-")
        || lower.contains("sk-") && lower.len() > 24
        || lower.contains("akia") && lower.len() > 20
        || secret_assignment_present(&lower)
        || lower.contains(".env")
        || lower.contains("super-secret")
        || url_with_secret_present(&lower)
}

fn secret_assignment_present(lower: &str) -> bool {
    [
        "password",
        "passwd",
        "api_key",
        "apikey",
        "secret",
        "token",
        "credential",
        "private_key",
        "auth",
        "session",
        "cookie",
    ]
    .iter()
    .any(|key| {
        lower.contains(&format!("{key}="))
            || lower.contains(&format!("{key}:"))
            || lower.contains(&format!("{key} ="))
            || lower.contains(&format!("{key} :"))
    })
}

fn url_with_secret_present(lower: &str) -> bool {
    (lower.contains("http://") || lower.contains("https://"))
        && (lower.contains('@')
            || lower.contains("token=")
            || lower.contains("api_key=")
            || lower.contains("apikey=")
            || lower.contains("secret=")
            || lower.contains("password="))
}

fn contains_code_or_command_manifest_text(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    lower.contains("```")
        || lower.contains("~~~")
        || lower.contains("rm -rf")
        || lower.starts_with("$ ")
        || [
            "curl ", "sudo ", "npm ", "pnpm ", "yarn ", "cargo ", "python ", "node ", "bash ",
            "sh ",
        ]
        .iter()
        .any(|command| lower.starts_with(command) || lower.contains(&format!("; {command}")))
}

fn contains_log_like_manifest_text(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    lower.contains("raw log")
        || lower.contains("stdout")
        || lower.contains("stderr")
        || lower.contains("stack trace")
        || lower.contains("traceback")
}

fn contains_env_assignment_manifest_text(value: &str) -> bool {
    value.split_whitespace().any(|token| {
        let Some((left, right)) = token.split_once('=') else {
            return false;
        };
        !left.is_empty()
            && !right.is_empty()
            && left.len() <= 96
            && left
                .chars()
                .next()
                .is_some_and(|character| character == '_' || character.is_ascii_alphabetic())
            && left.chars().all(|character| {
                character == '_' || character.is_ascii_uppercase() || character.is_ascii_digit()
            })
    })
}

fn is_broad_or_system_root(path: &Path) -> bool {
    let normalized = normalize_for_policy(path);
    if matches!(normalized.as_str(), "/" | "/users" | "/volumes") {
        return true;
    }

    if is_windows_broad_or_system_root(&normalized) {
        return true;
    }

    if matches_denied_root_or_descendant(
        &normalized,
        &[
            "/system",
            "/library",
            "/applications",
            "/private",
            "/tmp",
            "/var",
            "/etc",
            "/bin",
            "/sbin",
            "/usr",
            "/opt",
            "/dev",
            "/proc",
            "/run",
            "/mnt",
            "/home",
        ],
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

fn is_protected_system_path(path: &Path) -> bool {
    let normalized = normalize_for_policy(path);
    matches_denied_root_or_descendant(
        &normalized,
        &[
            "/system",
            "/library",
            "/applications",
            "/private",
            "/var",
            "/etc",
            "/bin",
            "/sbin",
            "/usr",
            "/opt",
            "/dev",
            "/proc",
            "/run",
            "c:/windows",
            "c:/program files",
            "c:/program files (x86)",
            "c:/programdata",
        ],
    )
}

fn is_allowed_advanced_broad_root(path: &Path) -> bool {
    let normalized = normalize_for_policy(path);
    if matches!(normalized.as_str(), "/" | "/users" | "/volumes") {
        return true;
    }
    if is_windows_broad_or_system_root(&normalized) {
        return true;
    }
    is_home_root(path)
}

fn is_windows_broad_or_system_root(normalized: &str) -> bool {
    let bytes = normalized.as_bytes();
    if bytes.len() < 2 || bytes[1] != b':' || !bytes[0].is_ascii_alphabetic() {
        return false;
    }

    matches!(
        &normalized[2..],
        "" | "/"
            | "/users"
            | "/windows"
            | "/program files"
            | "/program files (x86)"
            | "/programdata"
    )
}

fn matches_denied_root_or_descendant(normalized: &str, roots: &[&str]) -> bool {
    roots
        .iter()
        .any(|root| normalized == *root || normalized.starts_with(&format!("{root}/")))
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

fn discovery_display_name(mode: &ScanMode, root: &ValidatedRoot) -> String {
    match mode {
        ScanMode::CustomDirectory => root.display_name.clone(),
        ScanMode::IntelligentDiscovery => format!("智能发现 · {}", root.display_name),
        ScanMode::AdvancedFullDisk => format!("高级发现 · {}", root.display_name),
    }
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

fn boundary_labels_for(
    resource_kind: &'static str,
    sensitive: bool,
    skill_manifest_metadata_read: bool,
) -> Vec<&'static str> {
    let mut labels = vec!["read-only", "no-content-read", "no-symlink-follow"];
    if skill_manifest_metadata_read {
        labels.push("bounded-skill-manifest-metadata");
    }
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
        let code = error.command_code();
        match error {
            ScanError::InvalidPath(message) => Self { code, message },
            ScanError::InvalidProfile(message) => Self { code, message },
            ScanError::InvalidInput(message) => Self { code, message },
            ScanError::JobConflict(message) => Self { code, message },
            ScanError::JobMissing(message) => Self { code, message },
            ScanError::BatchMissing(message) => Self { code, message },
            ScanError::Cancelled => Self {
                code,
                message: "扫描已取消。".to_string(),
            },
            ScanError::RejectedRoot(message) => Self { code, message },
            ScanError::AdvancedConfirmationRequired => Self {
                code,
                message: "高级全盘发现需要先勾选显式确认。".to_string(),
            },
            ScanError::Permission(message) => Self { code, message },
            ScanError::SelectionMissing => Self {
                code,
                message: "请先通过系统目录选择器选择一个目录。".to_string(),
            },
            ScanError::Store(message) => Self { code, message },
        }
    }
}

impl ScanError {
    fn command_code(&self) -> &'static str {
        match self {
            ScanError::InvalidPath(_) => "invalid_path",
            ScanError::InvalidProfile(_) => "invalid_profile",
            ScanError::InvalidInput(_) => "invalid_input",
            ScanError::JobConflict(_) => "job_conflict",
            ScanError::JobMissing(_) => "job_missing",
            ScanError::BatchMissing(_) => "batch_missing",
            ScanError::Cancelled => "cancelled",
            ScanError::RejectedRoot(_) => "rejected_root",
            ScanError::AdvancedConfirmationRequired => "advanced_confirmation_required",
            ScanError::Permission(_) => "permission_error",
            ScanError::SelectionMissing => "selection_missing",
            ScanError::Store(_) => "resource_store_error",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        build_scan_job_event_payload, classify_resource_kind, current_time_ms,
        discovery_candidate_roots_for_home, excluded_names_for_scan_mode, get_scan_profiles,
        home_dir, normalize_source_ids, parse_bounded_skill_manifest_metadata,
        persist_completed_scan_result, persist_resource_input,
        read_bounded_skill_manifest_metadata, recompute_batch_counters, redact_relative_path,
        resolve_custom_directory_scan_profile, resolve_scan_profile, scan_validated_root,
        skip_inputs_from_counts, validate_scan_root, validate_scan_root_for_mode,
        ScanBatchProgress, ScanBatchSnapshot, ScanBatchSourceSnapshot, ScanBatchSourceStatus,
        ScanBatchStatus, ScanCancellation, ScanCounts, ScanJobStatus, ScanMode, ScanProgress,
        SelectedRoot, ADVANCED_FULL_DISK_PROFILE_ID, ADVANCED_FULL_DISK_SOURCE_KIND,
        CUSTOM_DIRECTORY_SOURCE_KIND, DEFAULT_SCAN_PROFILE_ID, INTELLIGENT_DISCOVERY_PROFILE_ID,
        MAX_SKILL_MANIFEST_DESCRIPTION_CHARS, MAX_SKILL_MANIFEST_METADATA_BYTES,
    };
    use crate::resource_store;
    use std::collections::HashSet;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static NEXT_TEST_RESOURCE_STORE: AtomicUsize = AtomicUsize::new(1);

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
            "C:\\",
            "C:\\Users",
            "C:\\Windows",
            "C:\\Program Files",
            "D:/",
        ] {
            let result = validate_scan_root(Path::new(root));
            assert!(result.is_err(), "expected {root} to be rejected");
        }
    }

    #[test]
    fn advanced_full_disk_rejects_without_confirmation() {
        let error = validate_scan_root_for_mode(Path::new("/"), &ScanMode::AdvancedFullDisk, false)
            .expect_err("advanced full-disk mode must require explicit confirmation");

        assert_eq!(error.command_code(), "advanced_confirmation_required");
    }

    #[test]
    fn advanced_full_disk_uses_stronger_excludes() {
        let advanced_excludes = excluded_names_for_scan_mode(&ScanMode::AdvancedFullDisk);
        let custom_excludes = excluded_names_for_scan_mode(&ScanMode::CustomDirectory);

        for expected in ["library", ".ssh", ".gnupg", "keychains", "cookies"] {
            assert!(
                advanced_excludes.contains(expected),
                "missing advanced exclude {expected}"
            );
        }
        assert!(!custom_excludes.contains("library"));
    }

    #[test]
    fn intelligent_discovery_candidates_avoid_system_roots() {
        let home = temp_discovery_home();
        let _ = fs::remove_dir_all(&home);
        fs::create_dir_all(home.join("Desktop")).expect("create Desktop");
        fs::create_dir_all(home.join("Projects")).expect("create Projects");

        let candidates = discovery_candidate_roots_for_home(&home, &ScanMode::IntelligentDiscovery)
            .expect("candidate resolver should succeed");

        assert!(candidates.iter().any(|root| root.ends_with("Desktop")));
        assert!(candidates.iter().any(|root| root.ends_with("Projects")));
        assert!(
            candidates
                .iter()
                .all(|root| !root.starts_with("/System") && !root.starts_with("/Library")),
            "intelligent discovery must not propose system roots"
        );

        let _ = fs::remove_dir_all(home);
    }

    #[test]
    fn discovery_skip_summaries_use_safe_reason_names() {
        let counts = ScanCounts {
            skipped_by_exclude: 2,
            skipped_by_guard: 1,
            skipped_by_metadata_error: 3,
            skipped_by_limit: 1,
            skipped_by_depth_limit: 1,
            skipped_by_cancellation: 1,
            skipped_by_size: 1,
            skipped_symlinks: 1,
            skipped_unsupported_roots: 1,
            skipped_duplicate_sources: 1,
            denied_errors: 3,
            ..ScanCounts::default()
        };
        let skips = skip_inputs_from_counts(&counts, &[]);
        let reasons = skips
            .iter()
            .map(|skip| skip.reason.as_str())
            .collect::<HashSet<_>>();

        for expected in [
            "excluded_directory",
            "protected_system_path",
            "permission_denied",
            "entry_limit",
            "depth_limit",
            "cancelled",
            "unsupported_root",
            "duplicate_source",
            "metadata_policy_skip",
        ] {
            assert!(reasons.contains(expected), "missing skip reason {expected}");
        }
        assert!(skips.iter().all(|skip| skip.sample_safe_path.is_none()));
    }

    #[test]
    fn custom_directory_mode_never_accepts_advanced_broad_roots() {
        let home = home_dir().expect("test environment should provide home");

        for mode in [ScanMode::CustomDirectory, ScanMode::IntelligentDiscovery] {
            let error = validate_scan_root_for_mode(&home, &mode, true).expect_err(
                "non-advanced modes must reject home root even if confirmation is true",
            );
            assert_eq!(error.command_code(), "rejected_root");
        }
    }

    #[test]
    fn custom_directory_source_creation_rejects_discovery_profiles() {
        for profile_id in [
            INTELLIGENT_DISCOVERY_PROFILE_ID,
            ADVANCED_FULL_DISK_PROFILE_ID,
        ] {
            let error = resolve_custom_directory_scan_profile(Some(profile_id))
                .expect_err("custom directory source creation must reject discovery profiles");
            assert_eq!(error.command_code(), "invalid_input");
        }

        let profile = resolve_custom_directory_scan_profile(Some("project-root"))
            .expect("normal custom profile should resolve");
        assert_eq!(profile.id, "project-root");
    }

    #[test]
    fn rejects_system_root_descendants() {
        for root in [
            "/System/Library",
            "/Library/Application Support",
            "/Applications/Utilities",
            "/private/var",
            "/tmp/aios-custom-scan",
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
    fn exposes_static_scan_profiles() {
        let profiles = get_scan_profiles();
        let ids = profiles
            .iter()
            .map(|profile| profile.id)
            .collect::<HashSet<_>>();

        assert_eq!(profiles.len(), 8);
        for expected in [
            "custom-folder",
            "project-root",
            "ai-toolchain",
            "skills-prompts-workspace",
            "docs-reports-workspace",
            "aios-workspace",
            "intelligent-discovery",
            "advanced-full-disk",
        ] {
            assert!(ids.contains(expected), "missing scan profile {expected}");
        }
        assert!(
            profiles.iter().all(
                |profile| profile.id == "advanced-full-disk" || !profile.full_disk_scan_enabled
            ),
            "only advanced full-disk profile may enable the full-disk capability flag"
        );
        assert!(
            profiles
                .iter()
                .all(|profile| profile.content_reading_enabled == false),
            "profiles must not enable content scanning"
        );
    }

    #[test]
    fn defaults_missing_profile_request_to_custom_folder() {
        let profile = resolve_scan_profile(None).expect("missing profile should use default");

        assert_eq!(profile.id, DEFAULT_SCAN_PROFILE_ID);
        assert_eq!(profile.max_depth, 6);
    }

    #[test]
    fn rejects_unknown_profile_request() {
        let error =
            resolve_scan_profile(Some("full-disk")).expect_err("unknown profile should fail");

        assert_eq!(error.command_code(), "invalid_profile");
    }

    #[test]
    fn cancellation_flag_is_shared_between_job_handles() {
        let cancellation = ScanCancellation::default();
        let cloned = cancellation.clone();

        assert!(!cancellation.is_requested());
        cloned.request();
        assert!(cancellation.is_requested());
    }

    #[test]
    fn progress_event_payload_uses_safe_aggregate_counters() {
        let progress = ScanProgress::from_counts(
            "project-root",
            &ScanCounts {
                visited_entries: 12,
                returned_resources: 5,
                skipped_by_exclude: 3,
                skipped_by_guard: 0,
                skipped_by_metadata_error: 1,
                skipped_by_limit: 0,
                skipped_by_depth_limit: 0,
                skipped_by_cancellation: 0,
                skipped_by_size: 1,
                skipped_symlinks: 2,
                skipped_unsupported_roots: 0,
                skipped_duplicate_sources: 0,
                denied_errors: 1,
                truncated: false,
            },
            5,
            100,
            "walking",
            false,
            6,
            2_000,
        );
        let payload =
            build_scan_job_event_payload("scan-job-test", ScanJobStatus::Running, progress, None);

        assert_eq!(payload.job_id, "scan-job-test");
        assert_eq!(payload.progress.visited_entries, 12);
        assert_eq!(payload.progress.matched_resources, 5);
        assert_eq!(payload.progress.skipped_entries, 7);
        assert_eq!(payload.progress.current_phase, "walking");
        assert_eq!(payload.progress.profile_id, "project-root");
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

    #[test]
    fn skill_manifest_metadata_extracts_safe_frontmatter_name_and_description() {
        let metadata = parse_bounded_skill_manifest_metadata(
            "---\nname: Better Writer\ndescription: Writes concise product summaries.\n---\n\nPrivate body text is not retained.",
        )
        .expect("safe frontmatter metadata should parse");

        assert_eq!(metadata.name.as_deref(), Some("Better Writer"));
        assert_eq!(
            metadata.description.as_deref(),
            Some("Writes concise product summaries.")
        );
    }

    #[test]
    fn skill_manifest_metadata_uses_heading_and_bounded_first_paragraph() {
        let metadata = parse_bounded_skill_manifest_metadata(
            "# Heading Writer\n\nWrites safe first-paragraph summaries for local skills.\n\nPrivate follow-up body is not retained.",
        )
        .expect("safe heading metadata should parse");

        assert_eq!(metadata.name.as_deref(), Some("Heading Writer"));
        assert_eq!(
            metadata.description.as_deref(),
            Some("Writes safe first-paragraph summaries for local skills.")
        );
    }

    #[test]
    fn skill_manifest_metadata_discards_secret_like_code_and_log_values() {
        let secret_metadata = parse_bounded_skill_manifest_metadata(
            "---\nname: token=super-secret-token\ndescription: api_key=super-secret-token\n---\n",
        );
        assert!(secret_metadata.is_none());

        let code_metadata = parse_bounded_skill_manifest_metadata(
            "---\nname: Safe Name\ndescription: ```bash\nrm -rf ~/.ssh\n```\n---\n",
        )
        .expect("safe name should survive unsafe description");
        assert_eq!(code_metadata.name.as_deref(), Some("Safe Name"));
        assert!(code_metadata.description.is_none());

        let log_metadata = parse_bounded_skill_manifest_metadata(
            "---\nname: Safe Name\ndescription: stderr: token=super-secret-token\n---\n",
        )
        .expect("safe name should survive unsafe log-like description");
        assert_eq!(log_metadata.name.as_deref(), Some("Safe Name"));
        assert!(log_metadata.description.is_none());

        let env_metadata = parse_bounded_skill_manifest_metadata(
            "---\nname: Safe Name\ndescription: OPENAI_API_KEY=super-secret-token\n---\n",
        )
        .expect("safe name should survive env-like unsafe description");
        assert_eq!(env_metadata.name.as_deref(), Some("Safe Name"));
        assert!(env_metadata.description.is_none());

        let url_metadata = parse_bounded_skill_manifest_metadata(
            "---\nname: Safe Name\ndescription: https://user:password@example.com/?token=super-secret-token\n---\n",
        )
        .expect("safe name should survive secret-bearing URL description");
        assert_eq!(url_metadata.name.as_deref(), Some("Safe Name"));
        assert!(url_metadata.description.is_none());
    }

    #[test]
    fn skill_manifest_metadata_falls_back_when_frontmatter_is_malformed() {
        let metadata = parse_bounded_skill_manifest_metadata(
            "---\nname: malformed frontmatter without close\n# Fallback Skill\n\nSafe fallback paragraph.",
        )
        .expect("malformed frontmatter should not fail metadata parsing");

        assert_eq!(metadata.name.as_deref(), Some("Fallback Skill"));
        assert_eq!(
            metadata.description.as_deref(),
            Some("Safe fallback paragraph.")
        );
    }

    #[test]
    fn skill_manifest_metadata_reads_only_bounded_prefix() {
        let root = temp_scan_fixture_root("bounded-skill-prefix");
        let _ = fs::remove_dir_all(&root);
        let skill_dir = root.join("skills/bounded");
        fs::create_dir_all(&skill_dir).expect("skill directory should be created");
        let long_safe_paragraph = "A".repeat(MAX_SKILL_MANIFEST_METADATA_BYTES + 512);
        fs::write(
            skill_dir.join("SKILL.md"),
            format!("# Bounded Skill\n\n{long_safe_paragraph} token=super-secret-token\n"),
        )
        .expect("bounded skill fixture should be written");

        let metadata = read_bounded_skill_manifest_metadata(&skill_dir.join("SKILL.md"))
            .expect("bounded prefix should produce safe metadata");

        assert_eq!(metadata.name.as_deref(), Some("Bounded Skill"));
        let description = metadata
            .description
            .as_deref()
            .expect("long safe paragraph should be shortened, not dropped");
        assert!(description.len() <= MAX_SKILL_MANIFEST_DESCRIPTION_CHARS + 3);
        assert!(description
            .chars()
            .all(|character| character == 'A' || character == '.'));
        assert!(!description.contains("super-secret-token"));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn scans_fixture_with_classification_and_excludes() {
        let canonical_root = fixture_root();
        let selected = SelectedRoot {
            selection_id: "test-fixture".to_string(),
            canonical_root,
            display_name: "custom-scan-basic".to_string(),
            root_summary: "~/custom-scan-basic".to_string(),
            source_kind: CUSTOM_DIRECTORY_SOURCE_KIND.to_string(),
            user_confirmed_mode: true,
        };

        let profile = resolve_scan_profile(Some("skills-prompts-workspace"))
            .expect("known profile should resolve");
        let result = scan_validated_root(&selected, &profile).expect("fixture scan should succeed");
        let kinds = result
            .resources
            .iter()
            .map(|resource| resource.resource_kind)
            .collect::<HashSet<_>>();

        assert_eq!(result.profile.id, "skills-prompts-workspace");

        for expected in [
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
        ] {
            assert!(kinds.contains(expected), "missing kind {expected}");
        }

        assert!(
            result
                .resources
                .iter()
                .all(|resource| !resource.relative_path.contains("venv")),
            "excluded venv entries should not be returned"
        );
        assert!(
            result.counts.skipped_by_exclude > 0,
            "fixture should exercise scanner-local excludes"
        );
    }

    #[test]
    fn scan_only_parses_skill_md_metadata_and_ignores_other_markdown() {
        let root = temp_scan_fixture_root("skill-metadata-scope");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("skills/better"))
            .expect("skill fixture directory should be created");
        fs::create_dir_all(root.join("docs")).expect("docs fixture directory should be created");
        fs::write(
            root.join("skills/better/SKILL.md"),
            "---\nname: Better Skill\ndescription: Safe skill metadata.\n---\nBody text not stored.",
        )
        .expect("skill manifest should be written");
        fs::write(
            root.join("docs/notes.md"),
            "---\nname: Private Doc\ndescription: Should never be parsed as skill metadata.\n---\n",
        )
        .expect("non-skill markdown should be written");

        let selected = SelectedRoot {
            selection_id: "skill-metadata-scope".to_string(),
            canonical_root: root.clone(),
            display_name: "skill-metadata-scope".to_string(),
            root_summary: "~/skill-metadata-scope".to_string(),
            source_kind: CUSTOM_DIRECTORY_SOURCE_KIND.to_string(),
            user_confirmed_mode: true,
        };
        let profile = resolve_scan_profile(Some(DEFAULT_SCAN_PROFILE_ID))
            .expect("default profile should resolve");
        let result = scan_validated_root(&selected, &profile).expect("scan should succeed");

        let skill = result
            .resources
            .iter()
            .find(|resource| resource.relative_path == "skills/better/SKILL.md")
            .expect("skill manifest should be returned");
        assert_eq!(
            skill
                .skill_manifest_metadata
                .as_ref()
                .and_then(|metadata| metadata.name.as_deref()),
            Some("Better Skill")
        );
        assert_eq!(
            skill
                .skill_manifest_metadata
                .as_ref()
                .and_then(|metadata| metadata.description.as_deref()),
            Some("Safe skill metadata.")
        );
        assert!(result.resources.iter().all(|resource| resource
            .skill_manifest_metadata
            .as_ref()
            .and_then(|metadata| metadata.name.as_deref())
            != Some("Private Doc")));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn scan_and_persist_use_safe_skill_manifest_metadata_when_available() {
        let root = temp_scan_fixture_root("skill-manifest-product");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("skills/writer"))
            .expect("skill fixture directory should be created");
        fs::write(
            root.join("skills/writer/SKILL.md"),
            "---\nname: Better Writer\ndescription: Writes concise product summaries.\n---\nPrivate body text is not retained.",
        )
        .expect("skill manifest should be written");

        let selected = SelectedRoot {
            selection_id: "skill-manifest-product".to_string(),
            canonical_root: root.clone(),
            display_name: "skill-manifest-product".to_string(),
            root_summary: "~/skill-manifest-product".to_string(),
            source_kind: CUSTOM_DIRECTORY_SOURCE_KIND.to_string(),
            user_confirmed_mode: true,
        };
        let profile =
            resolve_scan_profile(Some("project-root")).expect("known profile should resolve");
        let result = scan_validated_root(&selected, &profile).expect("scan should succeed");
        let db_path = temp_resource_store_path();
        resource_store::initialize_database(&db_path).expect("resource DB should initialize");
        let started_at_ms = current_time_ms();
        persist_completed_scan_result(
            &db_path,
            "scan-job-skill-manifest-product",
            "scanner-test",
            started_at_ms,
            started_at_ms + 250,
            &selected,
            &profile,
            &result,
        )
        .expect("manifest scan result should persist");

        let persisted_resources = resource_store::list_persisted_resources_for_path(&db_path, None)
            .expect("persisted resources should load");
        let persisted_skill = persisted_resources
            .iter()
            .find(|resource| resource.display_path == "skills/writer/SKILL.md")
            .expect("persisted skill should exist");
        assert_eq!(persisted_skill.name, "Better Writer");
        assert_eq!(
            persisted_skill.description,
            "Writes concise product summaries."
        );

        let skill_item = resource_store::list_skill_library_items_for_path(&db_path)
            .expect("skill library items should load")
            .into_iter()
            .find(|item| item.display_name == "Better Writer")
            .expect("Skill Library should use manifest name");
        assert_eq!(
            skill_item.short_purpose,
            "Writes concise product summaries."
        );
        let detail = resource_store::get_skill_detail_for_path(&db_path, &skill_item.id)
            .expect("skill detail should load");
        assert_eq!(detail.what_it_does, "Writes concise product summaries.");
        let stored_text = resource_store::debug_all_text_values_for_path(&db_path)
            .expect("debug text should load");
        assert!(!stored_text.contains("Private body text"));

        cleanup_resource_store(db_path);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn scan_falls_back_when_skill_manifest_metadata_is_unsafe_or_malformed() {
        let root = temp_scan_fixture_root("skill-manifest-fallback");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("skills/unsafe"))
            .expect("skill fixture directory should be created");
        fs::write(
            root.join("skills/unsafe/SKILL.md"),
            "---\nname: token=super-secret-token\ndescription: -----BEGIN PRIVATE KEY-----\n---\n",
        )
        .expect("unsafe skill manifest should be written");

        let selected = SelectedRoot {
            selection_id: "skill-manifest-fallback".to_string(),
            canonical_root: root.clone(),
            display_name: "skill-manifest-fallback".to_string(),
            root_summary: "~/skill-manifest-fallback".to_string(),
            source_kind: CUSTOM_DIRECTORY_SOURCE_KIND.to_string(),
            user_confirmed_mode: true,
        };
        let profile = resolve_scan_profile(Some(DEFAULT_SCAN_PROFILE_ID))
            .expect("default profile should resolve");
        let result = scan_validated_root(&selected, &profile).expect("scan should still succeed");
        let resource = result
            .resources
            .iter()
            .find(|resource| resource.relative_path == "skills/unsafe/SKILL.md")
            .expect("unsafe manifest should still be classified by path");

        assert!(resource.skill_manifest_metadata.is_none());
        assert_eq!(persist_resource_input(resource).name, "SKILL.md");
        assert_eq!(
            persist_resource_input(resource).description,
            "路径或文件名匹配技能资源。"
        );

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn fixture_scan_results_persist_to_resource_store() {
        let canonical_root = fixture_root();
        let selected = SelectedRoot {
            selection_id: "persist-fixture".to_string(),
            canonical_root,
            display_name: "custom-scan-basic".to_string(),
            root_summary: "~/custom-scan-basic".to_string(),
            source_kind: CUSTOM_DIRECTORY_SOURCE_KIND.to_string(),
            user_confirmed_mode: true,
        };
        let profile =
            resolve_scan_profile(Some("project-root")).expect("known profile should resolve");
        let result = scan_validated_root(&selected, &profile).expect("fixture scan should succeed");
        let db_path = temp_resource_store_path();
        resource_store::initialize_database(&db_path).expect("resource DB should initialize");

        let started_at_ms = current_time_ms();
        let finished_at_ms = started_at_ms + 250;
        persist_completed_scan_result(
            &db_path,
            "scan-job-fixture-persist",
            "scanner-test",
            started_at_ms,
            finished_at_ms,
            &selected,
            &profile,
            &result,
        )
        .expect("fixture scan result should persist");

        let summary =
            resource_store::get_library_summary_for_path(&db_path).expect("summary should load");
        assert_eq!(summary.source_count, 1);
        assert_eq!(summary.job_count, 1);
        assert_eq!(summary.resource_count, result.resources.len() as u64);
        assert_eq!(
            summary.latest_job.as_ref().map(|job| job.status.as_str()),
            Some("completed")
        );

        let persisted_resources = resource_store::list_persisted_resources_for_path(&db_path, None)
            .expect("persisted resources should load");
        assert!(
            persisted_resources
                .iter()
                .all(|resource| !resource.display_path.starts_with('/')),
            "resource locations should use redacted relative display paths"
        );

        let cleared =
            resource_store::clear_resource_library_for_path(&db_path).expect("clear should work");
        assert_eq!(cleared.resource_count, 0);
        cleanup_resource_store(db_path);
    }

    #[test]
    fn dynamic_corpus_receives_intelligent_discovery_resources() {
        let canonical_root = fixture_root();
        let selected = SelectedRoot {
            selection_id: "persist-discovery-fixture".to_string(),
            canonical_root,
            display_name: "Fixture Intelligent Discovery".to_string(),
            root_summary: "~/custom-scan-basic".to_string(),
            source_kind: "intelligent-discovery".to_string(),
            user_confirmed_mode: true,
        };
        let profile = resolve_scan_profile(Some("intelligent-discovery"))
            .expect("discovery profile should resolve");
        let result = scan_validated_root(&selected, &profile).expect("fixture scan should succeed");
        let db_path = temp_resource_store_path();
        resource_store::initialize_database(&db_path).expect("resource DB should initialize");

        let started_at_ms = current_time_ms();
        persist_completed_scan_result(
            &db_path,
            "scan-job-intelligent-persist",
            "scanner-test",
            started_at_ms,
            started_at_ms + 250,
            &selected,
            &profile,
            &result,
        )
        .expect("discovery result should persist");

        let sources =
            resource_store::list_scan_sources_for_path(&db_path).expect("sources should load");
        assert_eq!(sources[0].source_kind, "intelligent-discovery");

        let corpus_summary = resource_store::get_active_resource_corpus_summary_for_path(&db_path)
            .expect("corpus summary should load");
        assert_eq!(corpus_summary.resource_count, result.resources.len() as u64);

        cleanup_resource_store(db_path);
    }

    #[test]
    fn dynamic_corpus_receives_advanced_discovery_resources_from_fixture() {
        let canonical_root = fixture_root();
        let selected = SelectedRoot {
            selection_id: "persist-advanced-discovery-fixture".to_string(),
            canonical_root,
            display_name: "Fixture Advanced Discovery".to_string(),
            root_summary: "~/custom-scan-basic".to_string(),
            source_kind: ADVANCED_FULL_DISK_SOURCE_KIND.to_string(),
            user_confirmed_mode: true,
        };
        let profile = resolve_scan_profile(Some(ADVANCED_FULL_DISK_PROFILE_ID))
            .expect("advanced profile should resolve");
        let result = scan_validated_root(&selected, &profile).expect("fixture scan should succeed");
        let db_path = temp_resource_store_path();
        resource_store::initialize_database(&db_path).expect("resource DB should initialize");

        let started_at_ms = current_time_ms();
        persist_completed_scan_result(
            &db_path,
            "scan-job-advanced-persist",
            "scanner-test",
            started_at_ms,
            started_at_ms + 250,
            &selected,
            &profile,
            &result,
        )
        .expect("advanced discovery result should persist");

        let sources =
            resource_store::list_scan_sources_for_path(&db_path).expect("sources should load");
        assert_eq!(sources[0].source_kind, ADVANCED_FULL_DISK_SOURCE_KIND);
        assert_eq!(sources[0].profile_id, ADVANCED_FULL_DISK_PROFILE_ID);

        let corpus_summary = resource_store::get_active_resource_corpus_summary_for_path(&db_path)
            .expect("corpus summary should load");
        assert_eq!(corpus_summary.resource_count, result.resources.len() as u64);

        cleanup_resource_store(db_path);
    }

    #[test]
    fn batch_source_ids_are_normalized_and_deduplicated() {
        let ids = normalize_source_ids(vec![
            " source-a ".to_string(),
            "source-b".to_string(),
            "source-a".to_string(),
            "".to_string(),
        ])
        .expect("source ids should normalize");

        assert_eq!(ids, vec!["source-a", "source-b"]);
        assert!(normalize_source_ids(vec![" ".to_string()]).is_err());
    }

    #[test]
    fn batch_snapshot_counters_follow_sequential_source_states() {
        let mut snapshot = ScanBatchSnapshot {
            batch_id: "batch-test".to_string(),
            status: ScanBatchStatus::Queued,
            started_at_ms: 100,
            updated_at_ms: 100,
            completed_at_ms: None,
            total_sources: 2,
            completed_sources: 0,
            cancelled_sources: 0,
            failed_sources: 0,
            active_source_id: None,
            progress: ScanBatchProgress {
                completed_sources: 0,
                total_sources: 2,
                active_visited_entries: 0,
                active_matched_resources: 0,
                active_skipped_entries: 0,
                elapsed_ms: 0,
                cancellation_requested: false,
            },
            sources: vec![
                sample_batch_source("source-a", ScanBatchSourceStatus::Queued),
                sample_batch_source("source-b", ScanBatchSourceStatus::Queued),
            ],
            error: None,
        };

        snapshot.sources[0].status = ScanBatchSourceStatus::Completed;
        snapshot.sources[0].resources_found = 10;
        snapshot.sources[1].status = ScanBatchSourceStatus::Running;
        recompute_batch_counters(&mut snapshot);
        assert_eq!(snapshot.completed_sources, 1);
        assert_eq!(snapshot.cancelled_sources, 0);
        assert_eq!(snapshot.failed_sources, 0);

        snapshot.sources[1].status = ScanBatchSourceStatus::Cancelled;
        recompute_batch_counters(&mut snapshot);
        assert_eq!(snapshot.completed_sources, 2);
        assert_eq!(snapshot.cancelled_sources, 1);
        assert_eq!(snapshot.progress.completed_sources, 2);
    }

    #[test]
    fn scan_limit_updates_limit_counters() {
        let canonical_root = fixture_root();
        let selected = SelectedRoot {
            selection_id: "limit-fixture".to_string(),
            canonical_root,
            display_name: "custom-scan-basic".to_string(),
            root_summary: "~/custom-scan-basic".to_string(),
            source_kind: CUSTOM_DIRECTORY_SOURCE_KIND.to_string(),
            user_confirmed_mode: true,
        };
        let mut profile = resolve_scan_profile(Some(DEFAULT_SCAN_PROFILE_ID))
            .expect("default profile should resolve");
        profile.max_entries = 1;

        let result = scan_validated_root(&selected, &profile).expect("limited scan should succeed");

        assert!(result.counts.truncated);
        assert_eq!(result.counts.skipped_by_limit, 1);
        assert!(
            result
                .warnings
                .iter()
                .any(|warning| warning.code == "max_entries_reached"),
            "limit warning should be returned"
        );
    }

    #[test]
    fn scan_results_do_not_include_fixture_file_contents() {
        let canonical_root = fixture_root();
        let selected = SelectedRoot {
            selection_id: "no-content-fixture".to_string(),
            canonical_root,
            display_name: "custom-scan-basic".to_string(),
            root_summary: "~/custom-scan-basic".to_string(),
            source_kind: CUSTOM_DIRECTORY_SOURCE_KIND.to_string(),
            user_confirmed_mode: true,
        };
        let profile = resolve_scan_profile(Some(DEFAULT_SCAN_PROFILE_ID))
            .expect("default profile should resolve");

        let result = scan_validated_root(&selected, &profile).expect("fixture scan should succeed");
        let visible_metadata = result
            .resources
            .iter()
            .map(|resource| {
                format!(
                    "{} {} {}",
                    resource.relative_path, resource.classification_reason, resource.resource_kind
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        for forbidden in [
            "Fixture skill metadata file",
            "Fixture prompt placeholder",
            "Fixture unknown local resource",
        ] {
            assert!(
                !visible_metadata.contains(forbidden),
                "scan metadata must not expose fixture content marker {forbidden}"
            );
        }
    }

    #[cfg(unix)]
    #[test]
    fn skips_symlinks_without_following_targets() {
        use std::os::unix::fs::symlink;

        let root = symlink_fixture_root();
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("outside-target")).expect("create symlink target");
        fs::write(root.join("outside-target/SKILL.md"), "not read").expect("write target file");
        symlink(root.join("outside-target"), root.join("linked-target")).expect("create symlink");

        let selected = SelectedRoot {
            selection_id: "symlink-fixture".to_string(),
            canonical_root: root.clone(),
            display_name: "scanner-symlink-test".to_string(),
            root_summary: "~/scanner-symlink-test".to_string(),
            source_kind: CUSTOM_DIRECTORY_SOURCE_KIND.to_string(),
            user_confirmed_mode: true,
        };

        let profile = resolve_scan_profile(Some(DEFAULT_SCAN_PROFILE_ID))
            .expect("default profile should resolve");
        let result =
            scan_validated_root(&selected, &profile).expect("symlink fixture scan should succeed");

        assert!(
            result.counts.skipped_symlinks >= 1,
            "symlink should be counted as skipped"
        );
        assert!(
            result
                .resources
                .iter()
                .all(|resource| !resource.relative_path.contains("linked-target/SKILL.md")),
            "scanner must not follow symlink targets"
        );

        let _ = fs::remove_dir_all(root);
    }

    fn fixture_root() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../test-fixtures/custom-scan-basic")
            .canonicalize()
            .expect("fixture root should exist")
    }

    fn temp_discovery_home() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target/scanner-discovery-home")
    }

    #[test]
    fn root_guards_are_invariant_across_profiles() {
        let profiles = get_scan_profiles();

        for profile in profiles {
            assert!(
                resolve_scan_profile(Some(profile.id)).is_ok(),
                "profile should resolve before guard check"
            );
            for root in [
                "/",
                "/Users",
                "/System",
                "/Library",
                "/Applications",
                "/tmp",
            ] {
                let result = validate_scan_root(Path::new(root));
                assert!(
                    result.is_err(),
                    "{root} must remain rejected for profile {}",
                    profile.id
                );
            }
        }
    }

    fn symlink_fixture_root() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target/scanner-symlink-test")
    }

    fn temp_scan_fixture_root(name: &str) -> PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after epoch")
            .as_millis();
        let index = NEXT_TEST_RESOURCE_STORE.fetch_add(1, Ordering::Relaxed);
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join(format!("{name}-{now}-{index}"))
    }

    fn sample_batch_source(
        source_id: &str,
        status: ScanBatchSourceStatus,
    ) -> ScanBatchSourceSnapshot {
        ScanBatchSourceSnapshot {
            scan_source_id: source_id.to_string(),
            display_name: source_id.to_string(),
            root_display_path: format!("~/{source_id}"),
            profile_id: DEFAULT_SCAN_PROFILE_ID.to_string(),
            project_label: Some("Test Project".to_string()),
            status,
            job_id: None,
            resources_found: 0,
            skipped_entries: 0,
            error_count: 0,
            last_scanned_at_ms: None,
            message: None,
        }
    }

    fn temp_resource_store_path() -> PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after epoch")
            .as_millis();
        let index = NEXT_TEST_RESOURCE_STORE.fetch_add(1, Ordering::Relaxed);
        std::env::temp_dir()
            .join("aios-scanner-store-tests")
            .join(format!("fixture-{now}-{index}"))
            .join("resource-store.sqlite3")
    }

    fn cleanup_resource_store(db_path: PathBuf) {
        if let Some(parent) = db_path.parent() {
            let _ = fs::remove_dir_all(parent);
        }
    }
}
