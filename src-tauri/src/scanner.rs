use crate::resource_store::{
    self, PersistScanErrorInput, PersistScanJobInput, PersistScanResourceInput,
    PersistScanSkipInput, PersistScanSourceInput,
};
use ignore::WalkBuilder;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::fs;
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
const MAX_DEPTH: usize = 6;
const MAX_ENTRIES: usize = 2_000;
const MAX_FILE_SIZE_BYTES: u64 = 10 * 1024 * 1024;
const MAX_RETAINED_SCAN_JOBS: usize = 8;
const SCAN_JOB_PROGRESS_EVENT: &str = "aios://scan-job-progress";
const REDACTED_SEGMENT: &str = "[sensitive]";
static NEXT_SCAN_JOB_COUNTER: AtomicUsize = AtomicUsize::new(1);

#[derive(Default)]
pub struct ScanState {
    selected_root: Mutex<Option<SelectedRoot>>,
    jobs: Arc<Mutex<HashMap<String, ScanJobRecord>>>,
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
    skipped_by_cancellation: usize,
    skipped_by_size: usize,
    skipped_symlinks: usize,
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
    InvalidProfile(String),
    JobConflict(String),
    JobMissing(String),
    Cancelled,
    RejectedRoot(String),
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
        summary_json: completed_summary_json(result, profile),
        source: scan_source_input(selected_root, profile),
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
            reason: "skipped_by_cancellation".to_string(),
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
        summary_json: terminal_summary_json(snapshot),
        source: scan_source_input(selected_root, &profile),
        resources: Vec::new(),
        skips,
        errors: error_inputs,
    };

    resource_store::persist_scan_job_for_path(db_path, input).map_err(store_error_to_scan_error)
}

fn scan_source_input(
    selected_root: &SelectedRoot,
    profile: &ScanProfileDefinition,
) -> PersistScanSourceInput {
    PersistScanSourceInput {
        display_name: selected_root.display_name.clone(),
        root_path: selected_root.canonical_root.to_string_lossy().to_string(),
        root_display_path: selected_root.root_summary.clone(),
        profile_id: profile.id.to_string(),
        source_kind: "custom-directory".to_string(),
    }
}

fn persist_resource_input(resource: &ScanResource) -> PersistScanResourceInput {
    PersistScanResourceInput {
        name: display_name_for_relative_resource(&resource.relative_path),
        resource_kind: resource.resource_kind.to_string(),
        description: resource.classification_reason.to_string(),
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
            "skipped_by_exclude",
            counts.skipped_by_exclude,
            None::<&[&str]>,
        ),
        ("skipped_by_guard", counts.skipped_by_guard, None::<&[&str]>),
        (
            "skipped_by_metadata_error",
            counts.skipped_by_metadata_error,
            Some(&["metadata_denied", "walk_error"][..]),
        ),
        (
            "skipped_by_limit",
            counts.skipped_by_limit,
            Some(&["max_entries_reached"][..]),
        ),
        (
            "skipped_by_cancellation",
            counts.skipped_by_cancellation,
            None::<&[&str]>,
        ),
        (
            "skipped_by_size",
            counts.skipped_by_size,
            Some(&["max_file_size_skipped"][..]),
        ),
        (
            "skipped_symlinks",
            counts.skipped_symlinks,
            Some(&["symlink_skipped"][..]),
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

fn completed_summary_json(result: &CustomScanResult, profile: &ScanProfileDefinition) -> String {
    serde_json::json!({
        "policyId": result.policy_id,
        "profileId": profile.id,
        "metadataOnly": true,
        "contentStored": false,
        "executionEnabled": false,
        "fullDiskScanEnabled": false,
        "visitedEntries": result.counts.visited_entries,
        "matchedResources": result.resources.len(),
        "warningCount": result.warnings.len(),
        "truncated": result.counts.truncated
    })
    .to_string()
}

fn terminal_summary_json(snapshot: &ScanJobSnapshot) -> String {
    serde_json::json!({
        "profileId": snapshot.profile_id,
        "status": scan_job_status_value(&snapshot.status),
        "metadataOnly": true,
        "contentStored": false,
        "executionEnabled": false,
        "fullDiskScanEnabled": false,
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
        profile_ids: scan_profiles()
            .iter()
            .map(|profile| profile.id)
            .collect::<Vec<_>>(),
    }
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
        let code = error.command_code();
        match error {
            ScanError::InvalidPath(message) => Self { code, message },
            ScanError::InvalidProfile(message) => Self { code, message },
            ScanError::JobConflict(message) => Self { code, message },
            ScanError::JobMissing(message) => Self { code, message },
            ScanError::Cancelled => Self {
                code,
                message: "扫描已取消。".to_string(),
            },
            ScanError::RejectedRoot(message) => Self { code, message },
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
            ScanError::JobConflict(_) => "job_conflict",
            ScanError::JobMissing(_) => "job_missing",
            ScanError::Cancelled => "cancelled",
            ScanError::RejectedRoot(_) => "rejected_root",
            ScanError::Permission(_) => "permission_error",
            ScanError::SelectionMissing => "selection_missing",
            ScanError::Store(_) => "resource_store_error",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        build_scan_job_event_payload, classify_resource_kind, current_time_ms, get_scan_profiles,
        persist_completed_scan_result, redact_relative_path, resolve_scan_profile,
        scan_validated_root, validate_scan_root, ScanCancellation, ScanCounts, ScanJobStatus,
        ScanProgress, SelectedRoot, DEFAULT_SCAN_PROFILE_ID,
    };
    use crate::resource_store;
    use std::collections::HashSet;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

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

        assert_eq!(profiles.len(), 6);
        for expected in [
            "custom-folder",
            "project-root",
            "ai-toolchain",
            "skills-prompts-workspace",
            "docs-reports-workspace",
            "aios-workspace",
        ] {
            assert!(ids.contains(expected), "missing scan profile {expected}");
        }
        assert!(
            profiles
                .iter()
                .all(|profile| !profile.full_disk_scan_enabled
                    && profile.content_reading_enabled == false),
            "profiles must not enable full-disk or content scanning"
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
                skipped_by_cancellation: 0,
                skipped_by_size: 1,
                skipped_symlinks: 2,
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
    fn scans_fixture_with_classification_and_excludes() {
        let canonical_root = fixture_root();
        let selected = SelectedRoot {
            selection_id: "test-fixture".to_string(),
            canonical_root,
            display_name: "custom-scan-basic".to_string(),
            root_summary: "~/custom-scan-basic".to_string(),
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
    fn fixture_scan_results_persist_to_resource_store() {
        let canonical_root = fixture_root();
        let selected = SelectedRoot {
            selection_id: "persist-fixture".to_string(),
            canonical_root,
            display_name: "custom-scan-basic".to_string(),
            root_summary: "~/custom-scan-basic".to_string(),
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
    fn scan_limit_updates_limit_counters() {
        let canonical_root = fixture_root();
        let selected = SelectedRoot {
            selection_id: "limit-fixture".to_string(),
            canonical_root,
            display_name: "custom-scan-basic".to_string(),
            root_summary: "~/custom-scan-basic".to_string(),
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

    fn temp_resource_store_path() -> PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after epoch")
            .as_millis();
        std::env::temp_dir()
            .join("aios-scanner-store-tests")
            .join(format!("fixture-{now}"))
            .join("resource-store.sqlite3")
    }

    fn cleanup_resource_store(db_path: PathBuf) {
        if let Some(parent) = db_path.parent() {
            let _ = fs::remove_dir_all(parent);
        }
    }
}
