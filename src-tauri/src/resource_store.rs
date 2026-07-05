use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Manager, State};

const DATABASE_FILE_NAME: &str = "aios-resource-library.sqlite3";
const SCHEMA_VERSION: i64 = 3;
const DEFAULT_RESOURCE_QUERY_LIMIT: usize = 100;
const MAX_RESOURCE_QUERY_LIMIT: usize = 500;

#[derive(Clone, Debug)]
pub struct ResourceStoreState {
    db_path: PathBuf,
}

impl ResourceStoreState {
    pub fn from_app_handle(app: &tauri::AppHandle) -> Result<Self, ResourceStoreError> {
        let db_path = app
            .path()
            .app_local_data_dir()
            .map_err(|error| ResourceStoreError::Path(error.to_string()))?
            .join(DATABASE_FILE_NAME);
        initialize_database(&db_path)?;
        Ok(Self { db_path })
    }

    pub fn db_path(&self) -> PathBuf {
        self.db_path.clone()
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceStoreCommandError {
    pub(crate) code: &'static str,
    pub(crate) message: String,
}

#[derive(Debug)]
pub enum ResourceStoreError {
    Io(std::io::Error),
    InvalidInput(String),
    Path(String),
    Sql(rusqlite::Error),
    Json(serde_json::Error),
}

impl From<std::io::Error> for ResourceStoreError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<rusqlite::Error> for ResourceStoreError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Sql(error)
    }
}

impl From<serde_json::Error> for ResourceStoreError {
    fn from(error: serde_json::Error) -> Self {
        Self::Json(error)
    }
}

impl std::fmt::Display for ResourceStoreError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ResourceStoreError::Io(error) => write!(formatter, "resource store IO error: {error}"),
            ResourceStoreError::InvalidInput(error) => {
                write!(formatter, "resource store invalid input: {error}")
            }
            ResourceStoreError::Path(error) => {
                write!(formatter, "resource store path error: {error}")
            }
            ResourceStoreError::Sql(error) => {
                write!(formatter, "resource store SQLite error: {error}")
            }
            ResourceStoreError::Json(error) => {
                write!(formatter, "resource store JSON error: {error}")
            }
        }
    }
}

impl std::error::Error for ResourceStoreError {}

impl From<ResourceStoreError> for ResourceStoreCommandError {
    fn from(error: ResourceStoreError) -> Self {
        match error {
            ResourceStoreError::Io(error) => Self {
                code: "resource_store_io_error",
                message: format!("本地资源库文件初始化失败：{error}"),
            },
            ResourceStoreError::InvalidInput(error) => Self {
                code: "resource_store_invalid_input",
                message: error,
            },
            ResourceStoreError::Path(error) => Self {
                code: "resource_store_path_error",
                message: format!("无法解析 AIOS 应用数据目录：{error}"),
            },
            ResourceStoreError::Sql(error) => Self {
                code: "resource_store_sqlite_error",
                message: format!("本地资源库 SQLite 操作失败：{error}"),
            },
            ResourceStoreError::Json(error) => Self {
                code: "resource_store_json_error",
                message: format!("本地资源库元数据序列化失败：{error}"),
            },
        }
    }
}

#[derive(Clone, Debug)]
pub struct PersistScanSourceInput {
    pub id: Option<String>,
    pub display_name: String,
    pub root_path: String,
    pub root_display_path: String,
    pub profile_id: String,
    pub source_kind: String,
    pub project_label: Option<String>,
}

#[derive(Clone, Debug)]
pub struct PersistScanResourceInput {
    pub name: String,
    pub resource_kind: String,
    pub description: String,
    pub primary_type: String,
    pub risk_level: String,
    pub boundary_labels: Vec<String>,
    pub relative_path: String,
    pub display_path: String,
    pub extension: Option<String>,
    pub entry_type: String,
    pub size_bytes: Option<u64>,
    pub modified_at_ms: Option<u64>,
    pub classification_reason: String,
    pub sensitive_path_redacted: bool,
    pub risk_labels: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct PersistScanSkipInput {
    pub reason: String,
    pub count: u64,
    pub sample_safe_path: Option<String>,
}

#[derive(Clone, Debug)]
pub struct PersistScanErrorInput {
    pub error_kind: String,
    pub message: String,
    pub sample_safe_path: Option<String>,
}

#[derive(Clone, Debug)]
pub struct PersistScanJobInput {
    pub id: String,
    pub status: String,
    pub profile_id: String,
    pub started_at_ms: u64,
    pub finished_at_ms: Option<u64>,
    pub elapsed_ms: u64,
    pub requested_by: String,
    pub total_entries: u64,
    pub matched_resources: u64,
    pub skipped_entries: u64,
    pub error_count: u64,
    pub cancelled: bool,
    pub summary_json: String,
    pub source: PersistScanSourceInput,
    pub resources: Vec<PersistScanResourceInput>,
    pub skips: Vec<PersistScanSkipInput>,
    pub errors: Vec<PersistScanErrorInput>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingRecord {
    pub key: String,
    pub value_json: String,
    pub updated_at_ms: u64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetAppSettingInput {
    pub key: String,
    pub value_json: String,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceStoreStatus {
    pub database_ready: bool,
    pub schema_version: i64,
    pub source_count: u64,
    pub enabled_source_count: u64,
    pub job_count: u64,
    pub resource_count: u64,
    pub metadata_only: bool,
    pub content_storage_enabled: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersistedScanSource {
    pub id: String,
    pub display_name: String,
    pub root_display_path: String,
    pub profile_id: String,
    pub source_kind: String,
    pub project_label: Option<String>,
    pub enabled: bool,
    pub created_at_ms: u64,
    pub updated_at_ms: u64,
    pub last_scan_job_id: Option<String>,
    pub last_scan_status: Option<String>,
    pub last_scan_finished_at_ms: Option<u64>,
    pub resource_count: u64,
    pub skipped_entries: u64,
    pub error_count: u64,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersistedScanJob {
    pub id: String,
    pub status: String,
    pub profile_id: String,
    pub started_at_ms: u64,
    pub finished_at_ms: Option<u64>,
    pub elapsed_ms: u64,
    pub requested_by: String,
    pub total_entries: u64,
    pub matched_resources: u64,
    pub skipped_entries: u64,
    pub error_count: u64,
    pub cancelled: bool,
    pub root_display_path: String,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceKindCount {
    pub resource_kind: String,
    pub count: u64,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScanSkipReasonCount {
    pub reason: String,
    pub count: u64,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceLibrarySummary {
    pub source_count: u64,
    pub enabled_source_count: u64,
    pub job_count: u64,
    pub resource_count: u64,
    pub location_count: u64,
    pub latest_job: Option<PersistedScanJob>,
    pub latest_successful_scan: Option<PersistedScanJob>,
    pub counts_by_kind: Vec<ResourceKindCount>,
    pub skip_counts_by_reason: Vec<ScanSkipReasonCount>,
    pub skipped_entry_total: u64,
    pub error_total: u64,
    pub metadata_only: bool,
    pub content_storage_enabled: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PersistedResource {
    pub id: String,
    pub stable_key: String,
    pub name: String,
    pub resource_kind: String,
    pub description: String,
    pub primary_type: String,
    pub risk_level: String,
    pub display_path: String,
    pub extension: Option<String>,
    pub entry_type: String,
    pub size_bytes: Option<u64>,
    pub modified_at_ms: Option<u64>,
    pub classification_reason: String,
    pub sensitive_path_redacted: bool,
    pub scan_source_id: Option<String>,
    pub scan_job_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCorpusScope {
    pub id: String,
    pub scope_kind: String,
    pub label: String,
    pub description: String,
    pub resource_count: u64,
    pub project_label: Option<String>,
    pub scan_source_id: Option<String>,
    pub root_display_path: Option<String>,
    pub profile_id: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceScopeCount {
    pub scope_id: String,
    pub scope_kind: String,
    pub label: String,
    pub count: u64,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCorpusSummary {
    pub source_count: u64,
    pub enabled_source_count: u64,
    pub project_scope_count: u64,
    pub resource_count: u64,
    pub location_count: u64,
    pub latest_successful_scan: Option<PersistedScanJob>,
    pub counts_by_kind: Vec<ResourceKindCount>,
    pub counts_by_scope: Vec<ResourceScopeCount>,
    pub skipped_entry_total: u64,
    pub error_total: u64,
    pub metadata_only: bool,
    pub content_storage_enabled: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCorpusResource {
    pub id: String,
    pub stable_key: String,
    pub name: String,
    pub resource_kind: String,
    pub description: String,
    pub primary_type: String,
    pub risk_level: String,
    pub boundary_labels: Vec<String>,
    pub updated_at_ms: u64,
    pub location_id: Option<String>,
    pub scan_source_id: Option<String>,
    pub scan_source_name: Option<String>,
    pub source_kind: Option<String>,
    pub scan_source_enabled: Option<bool>,
    pub project_label: Option<String>,
    pub root_display_path: Option<String>,
    pub profile_id: Option<String>,
    pub scan_job_id: Option<String>,
    pub scan_job_status: Option<String>,
    pub scan_job_started_at_ms: Option<u64>,
    pub scan_job_finished_at_ms: Option<u64>,
    pub relative_path: Option<String>,
    pub display_path: Option<String>,
    pub extension: Option<String>,
    pub entry_type: Option<String>,
    pub size_bytes: Option<u64>,
    pub modified_at_ms: Option<u64>,
    pub classification_reason: Option<String>,
    pub sensitive_path_redacted: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCorpusLocation {
    pub id: String,
    pub scan_source_id: String,
    pub scan_source_name: String,
    pub project_label: Option<String>,
    pub root_display_path: String,
    pub profile_id: String,
    pub scan_job_id: String,
    pub scan_job_status: String,
    pub relative_path: String,
    pub display_path: String,
    pub extension: Option<String>,
    pub entry_type: String,
    pub size_bytes: Option<u64>,
    pub modified_at_ms: Option<u64>,
    pub classification_reason: String,
    pub sensitive_path_redacted: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCorpusFinding {
    pub id: String,
    pub scan_job_id: String,
    pub finding_kind: String,
    pub severity: String,
    pub message: String,
    pub safe_detail_json: String,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCorpusDetail {
    pub resource: ResourceCorpusResource,
    pub locations: Vec<ResourceCorpusLocation>,
    pub findings: Vec<ResourceCorpusFinding>,
    pub metadata_only: bool,
    pub content_storage_enabled: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceCorpusQuery {
    pub scope_kind: Option<String>,
    pub scope_id: Option<String>,
    pub project_label: Option<String>,
    pub scan_source_id: Option<String>,
    pub resource_kind: Option<String>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateScanSourceInput {
    pub id: String,
    pub display_name: Option<String>,
    pub profile_id: Option<String>,
    pub project_label: Option<String>,
    pub enabled: Option<bool>,
}

#[derive(Clone, Debug)]
pub struct UpsertScanSourceInput {
    pub id: Option<String>,
    pub display_name: String,
    pub root_path: String,
    pub root_display_path: String,
    pub profile_id: String,
    pub source_kind: String,
    pub project_label: Option<String>,
    pub enabled: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StoredScanSource {
    pub id: String,
    pub display_name: String,
    pub root_path: String,
    pub root_display_path: String,
    pub profile_id: String,
    pub source_kind: String,
    pub project_label: Option<String>,
    pub enabled: bool,
}

#[tauri::command]
pub fn get_resource_store_status(
    state: State<'_, ResourceStoreState>,
) -> Result<ResourceStoreStatus, ResourceStoreCommandError> {
    store_status_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn get_app_setting(
    state: State<'_, ResourceStoreState>,
    key: String,
) -> Result<Option<AppSettingRecord>, ResourceStoreCommandError> {
    get_app_setting_for_path(&state.db_path, &key).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn set_app_setting(
    state: State<'_, ResourceStoreState>,
    input: SetAppSettingInput,
) -> Result<AppSettingRecord, ResourceStoreCommandError> {
    set_app_setting_for_path(&state.db_path, &input.key, &input.value_json)
        .map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn list_scan_sources(
    state: State<'_, ResourceStoreState>,
) -> Result<Vec<PersistedScanSource>, ResourceStoreCommandError> {
    list_scan_sources_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn list_persisted_scan_jobs(
    state: State<'_, ResourceStoreState>,
    limit: Option<usize>,
) -> Result<Vec<PersistedScanJob>, ResourceStoreCommandError> {
    list_scan_jobs_for_path(&state.db_path, limit).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn get_resource_library_summary(
    state: State<'_, ResourceStoreState>,
) -> Result<ResourceLibrarySummary, ResourceStoreCommandError> {
    get_library_summary_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn list_persisted_resources(
    state: State<'_, ResourceStoreState>,
    limit: Option<usize>,
) -> Result<Vec<PersistedResource>, ResourceStoreCommandError> {
    list_persisted_resources_for_path(&state.db_path, limit)
        .map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn list_resource_corpus_scopes(
    state: State<'_, ResourceStoreState>,
) -> Result<Vec<ResourceCorpusScope>, ResourceStoreCommandError> {
    list_resource_corpus_scopes_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn list_project_scopes(
    state: State<'_, ResourceStoreState>,
) -> Result<Vec<ResourceCorpusScope>, ResourceStoreCommandError> {
    list_project_scopes_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn get_active_resource_corpus_summary(
    state: State<'_, ResourceStoreState>,
) -> Result<ResourceCorpusSummary, ResourceStoreCommandError> {
    get_active_resource_corpus_summary_for_path(&state.db_path)
        .map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn list_resources_by_scope(
    state: State<'_, ResourceStoreState>,
    query: ResourceCorpusQuery,
) -> Result<Vec<ResourceCorpusResource>, ResourceStoreCommandError> {
    list_resources_by_scope_for_path(&state.db_path, query).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn list_resources_by_kind(
    state: State<'_, ResourceStoreState>,
    resource_kind: String,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<ResourceCorpusResource>, ResourceStoreCommandError> {
    list_resources_by_kind_for_path(&state.db_path, &resource_kind, limit, offset)
        .map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn get_resource_detail(
    state: State<'_, ResourceStoreState>,
    resource_id: String,
) -> Result<ResourceCorpusDetail, ResourceStoreCommandError> {
    get_resource_detail_for_path(&state.db_path, &resource_id)
        .map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn get_resource_counts_by_scope(
    state: State<'_, ResourceStoreState>,
) -> Result<Vec<ResourceScopeCount>, ResourceStoreCommandError> {
    get_resource_counts_by_scope_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn clear_resource_library(
    state: State<'_, ResourceStoreState>,
) -> Result<ResourceLibrarySummary, ResourceStoreCommandError> {
    clear_resource_library_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn update_scan_source(
    state: State<'_, ResourceStoreState>,
    input: UpdateScanSourceInput,
) -> Result<PersistedScanSource, ResourceStoreCommandError> {
    update_scan_source_for_path(&state.db_path, input).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn remove_scan_source(
    state: State<'_, ResourceStoreState>,
    source_id: String,
) -> Result<ResourceLibrarySummary, ResourceStoreCommandError> {
    remove_scan_source_for_path(&state.db_path, &source_id).map_err(ResourceStoreCommandError::from)
}

pub fn initialize_database(db_path: &Path) -> Result<(), ResourceStoreError> {
    let conn = open_raw_connection(db_path)?;
    migrate_v1(&conn)?;
    migrate_v2(&conn)?;
    migrate_v3(&conn)?;
    Ok(())
}

pub fn upsert_scan_source_for_path(
    db_path: &Path,
    input: UpsertScanSourceInput,
) -> Result<PersistedScanSource, ResourceStoreError> {
    validate_source_input(
        input.display_name.as_str(),
        input.root_path.as_str(),
        input.root_display_path.as_str(),
        input.profile_id.as_str(),
        input.source_kind.as_str(),
    )?;
    let mut conn = open_initialized_connection(db_path)?;
    let tx = conn.transaction()?;
    let now = current_time_ms();
    let source_id = scan_source_id_for_input(&tx, input.id.as_deref(), &input)?;
    let project_label = normalized_optional_text(input.project_label.as_deref());

    upsert_scan_source_tx(
        &tx,
        &source_id,
        &input.display_name,
        &input.root_path,
        &input.root_display_path,
        &input.profile_id,
        &input.source_kind,
        project_label.as_deref(),
        input.enabled,
        now,
        None,
    )?;
    upsert_project_scope_tx(
        &tx,
        &input.source_kind,
        &input.root_path,
        project_label.as_deref().unwrap_or(&input.display_name),
        &input.root_display_path,
        &input.profile_id,
        now,
    )?;
    tx.commit()?;

    get_scan_source_for_path(db_path, &source_id)
}

pub fn update_scan_source_for_path(
    db_path: &Path,
    input: UpdateScanSourceInput,
) -> Result<PersistedScanSource, ResourceStoreError> {
    let source_id = normalized_required_text("扫描来源 ID", &input.id)?;
    let mut conn = open_initialized_connection(db_path)?;
    let tx = conn.transaction()?;
    let existing = stored_scan_source_by_id(&tx, &source_id)?
        .ok_or_else(|| ResourceStoreError::InvalidInput("未找到要更新的扫描来源。".to_string()))?;
    let display_name =
        normalized_optional_text(input.display_name.as_deref()).unwrap_or(existing.display_name);
    let profile_id =
        normalized_optional_text(input.profile_id.as_deref()).unwrap_or(existing.profile_id);
    let project_label = normalized_optional_text(input.project_label.as_deref())
        .or_else(|| existing.project_label.clone());
    let enabled = input.enabled.unwrap_or(existing.enabled);
    let now = current_time_ms();

    validate_source_input(
        &display_name,
        &existing.root_path,
        &existing.root_display_path,
        &profile_id,
        &existing.source_kind,
    )?;
    upsert_scan_source_tx(
        &tx,
        &source_id,
        &display_name,
        &existing.root_path,
        &existing.root_display_path,
        &profile_id,
        &existing.source_kind,
        project_label.as_deref(),
        enabled,
        now,
        None,
    )?;
    upsert_project_scope_tx(
        &tx,
        &existing.source_kind,
        &existing.root_path,
        project_label.as_deref().unwrap_or(&display_name),
        &existing.root_display_path,
        &profile_id,
        now,
    )?;
    tx.commit()?;

    get_scan_source_for_path(db_path, &source_id)
}

pub fn remove_scan_source_for_path(
    db_path: &Path,
    source_id: &str,
) -> Result<ResourceLibrarySummary, ResourceStoreError> {
    let source_id = normalized_required_text("扫描来源 ID", source_id)?;
    let mut conn = open_initialized_connection(db_path)?;
    let tx = conn.transaction()?;
    let existing = stored_scan_source_by_id(&tx, &source_id)?
        .ok_or_else(|| ResourceStoreError::InvalidInput("未找到要删除的扫描来源。".to_string()))?;
    let job_ids = source_job_ids(&tx, &source_id)?;

    for job_id in job_ids {
        tx.execute("DELETE FROM scan_jobs WHERE id = ?1", params![job_id])?;
    }
    tx.execute("DELETE FROM scan_sources WHERE id = ?1", params![source_id])?;
    tx.execute(
        "DELETE FROM resources
        WHERE id NOT IN (SELECT DISTINCT resource_id FROM resource_locations)",
        [],
    )?;
    tx.execute(
        "DELETE FROM project_scopes WHERE root_path = ?1 AND profile_id = ?2",
        params![existing.root_path, existing.profile_id],
    )?;
    tx.commit()?;

    get_library_summary_for_path(db_path)
}

pub fn persist_scan_job_for_path(
    db_path: &Path,
    input: PersistScanJobInput,
) -> Result<(), ResourceStoreError> {
    let mut conn = open_initialized_connection(db_path)?;
    let tx = conn.transaction()?;
    let now = current_time_ms();
    validate_source_input(
        &input.source.display_name,
        &input.source.root_path,
        &input.source.root_display_path,
        &input.source.profile_id,
        &input.source.source_kind,
    )?;
    let source_id = scan_source_id_for_persist_input(&tx, &input.source)?;
    let project_label = normalized_optional_text(input.source.project_label.as_deref());

    tx.execute("DELETE FROM scan_jobs WHERE id = ?1", params![input.id])?;
    upsert_scan_source_tx(
        &tx,
        &source_id,
        &input.source.display_name,
        &input.source.root_path,
        &input.source.root_display_path,
        &input.source.profile_id,
        &input.source.source_kind,
        project_label.as_deref(),
        true,
        now,
        Some(&input.id),
    )?;
    upsert_project_scope_tx(
        &tx,
        &input.source.source_kind,
        &input.source.root_path,
        project_label
            .as_deref()
            .unwrap_or(input.source.display_name.as_str()),
        &input.source.root_display_path,
        &input.source.profile_id,
        now,
    )?;
    tx.execute(
        "INSERT INTO scan_jobs (
            id, status, profile_id, started_at, finished_at, elapsed_ms, requested_by,
            total_entries, matched_resources, skipped_entries, error_count, cancelled, summary_json
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            input.id,
            input.status,
            input.profile_id,
            u64_to_i64(input.started_at_ms),
            input.finished_at_ms.map(u64_to_i64),
            u64_to_i64(input.elapsed_ms),
            input.requested_by,
            u64_to_i64(input.total_entries),
            u64_to_i64(input.matched_resources),
            u64_to_i64(input.skipped_entries),
            u64_to_i64(input.error_count),
            bool_to_i64(input.cancelled),
            input.summary_json,
        ],
    )?;
    tx.execute(
        "INSERT INTO scan_job_sources (
            scan_job_id, scan_source_id, root_display_path, profile_id
        ) VALUES (?1, ?2, ?3, ?4)",
        params![
            input.id,
            source_id,
            input.source.root_display_path,
            input.source.profile_id
        ],
    )?;

    for resource in &input.resources {
        let stable_key = stable_resource_key(
            &source_id,
            &input.profile_id,
            &resource.resource_kind,
            &resource.relative_path,
        );
        let resource_id = stable_id("resource", &[&stable_key]);
        let boundary_labels_json = serde_json::to_string(&resource.boundary_labels)?;
        tx.execute(
            "INSERT INTO resources (
                id, stable_key, name, resource_kind, description, primary_type,
                risk_level, boundary_labels_json, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
            ON CONFLICT(stable_key) DO UPDATE SET
                name = excluded.name,
                resource_kind = excluded.resource_kind,
                description = excluded.description,
                primary_type = excluded.primary_type,
                risk_level = excluded.risk_level,
                boundary_labels_json = excluded.boundary_labels_json,
                updated_at = excluded.updated_at",
            params![
                resource_id,
                stable_key,
                resource.name,
                resource.resource_kind,
                resource.description,
                resource.primary_type,
                resource.risk_level,
                boundary_labels_json,
                now
            ],
        )?;
        let location_id = stable_id(
            "resource-location",
            &[&input.id, &source_id, &resource_id, &resource.relative_path],
        );
        tx.execute(
            "INSERT OR REPLACE INTO resource_locations (
                id, resource_id, scan_source_id, scan_job_id, relative_path, display_path,
                extension, entry_type, size_bytes, modified_at, classification_reason,
                sensitive_path_redacted
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                location_id,
                resource_id,
                source_id,
                input.id,
                resource.relative_path,
                resource.display_path,
                resource.extension,
                resource.entry_type,
                resource.size_bytes.map(u64_to_i64),
                resource.modified_at_ms.map(u64_to_i64),
                resource.classification_reason,
                bool_to_i64(resource.sensitive_path_redacted),
            ],
        )?;

        for finding in findings_for_resource(resource) {
            let finding_id = stable_id(
                "resource-finding",
                &[&input.id, &resource_id, finding.finding_kind],
            );
            tx.execute(
                "INSERT OR REPLACE INTO resource_findings (
                    id, resource_id, scan_job_id, finding_kind, severity, message, safe_detail_json
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    finding_id,
                    resource_id,
                    input.id,
                    finding.finding_kind,
                    finding.severity,
                    finding.message,
                    finding.safe_detail_json,
                ],
            )?;
        }
    }

    for skip in &input.skips {
        if skip.count == 0 {
            continue;
        }
        let skip_id = stable_id("scan-skip", &[&input.id, &source_id, &skip.reason]);
        tx.execute(
            "INSERT OR REPLACE INTO scan_skips (
                id, scan_job_id, scan_source_id, reason, count, sample_safe_path
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                skip_id,
                input.id,
                source_id,
                skip.reason,
                u64_to_i64(skip.count),
                skip.sample_safe_path,
            ],
        )?;
    }

    for (index, error) in input.errors.iter().enumerate() {
        let error_id = stable_id(
            "scan-error",
            &[&input.id, &source_id, &error.error_kind, &index.to_string()],
        );
        tx.execute(
            "INSERT OR REPLACE INTO scan_errors (
                id, scan_job_id, scan_source_id, error_kind, message, sample_safe_path
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                error_id,
                input.id,
                source_id,
                error.error_kind,
                error.message,
                error.sample_safe_path,
            ],
        )?;
    }

    tx.commit()?;
    Ok(())
}

pub fn store_status_for_path(db_path: &Path) -> Result<ResourceStoreStatus, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    Ok(ResourceStoreStatus {
        database_ready: true,
        schema_version: schema_version(&conn)?,
        source_count: count_rows(&conn, "scan_sources")?,
        enabled_source_count: scalar_count(
            &conn,
            "SELECT COUNT(*) FROM scan_sources WHERE enabled = 1",
        )?,
        job_count: count_rows(&conn, "scan_jobs")?,
        resource_count: count_rows(&conn, "resources")?,
        metadata_only: true,
        content_storage_enabled: false,
    })
}

pub fn get_app_setting_for_path(
    db_path: &Path,
    key: &str,
) -> Result<Option<AppSettingRecord>, ResourceStoreError> {
    let key = normalize_app_setting_key(key)?;
    let conn = open_initialized_connection(db_path)?;
    conn.query_row(
        "SELECT key, value_json, updated_at FROM app_settings WHERE key = ?1",
        params![key],
        row_to_app_setting,
    )
    .optional()
    .map_err(ResourceStoreError::from)
}

pub fn set_app_setting_for_path(
    db_path: &Path,
    key: &str,
    value_json: &str,
) -> Result<AppSettingRecord, ResourceStoreError> {
    let key = normalize_app_setting_key(key)?;
    serde_json::from_str::<serde_json::Value>(value_json).map_err(|error| {
        ResourceStoreError::InvalidInput(format!("app setting value must be valid JSON: {error}"))
    })?;

    let conn = open_initialized_connection(db_path)?;
    let now = current_time_ms();
    conn.execute(
        "INSERT INTO app_settings (key, value_json, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET
            value_json = excluded.value_json,
            updated_at = excluded.updated_at",
        params![&key, value_json.trim(), u64_to_i64(now)],
    )?;

    get_app_setting_for_path(db_path, &key)?.ok_or_else(|| {
        ResourceStoreError::InvalidInput("app setting was not persisted".to_string())
    })
}

pub fn list_scan_sources_for_path(
    db_path: &Path,
) -> Result<Vec<PersistedScanSource>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let mut stmt = conn.prepare(
        "SELECT
            s.id, s.display_name, s.root_display_path, s.profile_id, s.source_kind, s.enabled,
            s.created_at, s.updated_at, s.last_scan_job_id, j.status, j.finished_at,
            s.project_label,
            (SELECT COUNT(DISTINCT l.resource_id) FROM resource_locations l WHERE l.scan_source_id = s.id),
            COALESCE((SELECT SUM(count) FROM scan_skips sk WHERE sk.scan_source_id = s.id), 0),
            COALESCE((SELECT COUNT(*) FROM scan_errors se WHERE se.scan_source_id = s.id), 0)
        FROM scan_sources s
        LEFT JOIN scan_jobs j ON j.id = s.last_scan_job_id
        ORDER BY s.updated_at DESC, s.display_name ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(PersistedScanSource {
            id: row.get(0)?,
            display_name: row.get(1)?,
            root_display_path: row.get(2)?,
            profile_id: row.get(3)?,
            source_kind: row.get(4)?,
            enabled: int_to_bool(row.get(5)?),
            created_at_ms: i64_to_u64(row.get(6)?),
            updated_at_ms: i64_to_u64(row.get(7)?),
            last_scan_job_id: row.get(8)?,
            last_scan_status: row.get(9)?,
            last_scan_finished_at_ms: row.get::<_, Option<i64>>(10)?.map(i64_to_u64),
            project_label: row.get(11)?,
            resource_count: i64_to_u64(row.get(12)?),
            skipped_entries: i64_to_u64(row.get(13)?),
            error_count: i64_to_u64(row.get(14)?),
        })
    })?;

    collect_rows(rows)
}

pub fn list_scan_jobs_for_path(
    db_path: &Path,
    limit: Option<usize>,
) -> Result<Vec<PersistedScanJob>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let limit = normalize_limit(limit, 50);
    let mut stmt = conn.prepare(
        "SELECT
            j.id, j.status, j.profile_id, j.started_at, j.finished_at, j.elapsed_ms,
            j.requested_by, j.total_entries, j.matched_resources, j.skipped_entries,
            j.error_count, j.cancelled, COALESCE(js.root_display_path, '')
        FROM scan_jobs j
        LEFT JOIN scan_job_sources js ON js.scan_job_id = j.id
        ORDER BY j.started_at DESC
        LIMIT ?1",
    )?;
    let rows = stmt.query_map(params![limit], row_to_scan_job)?;

    collect_rows(rows)
}

pub fn get_library_summary_for_path(
    db_path: &Path,
) -> Result<ResourceLibrarySummary, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let latest_job = latest_scan_job(&conn)?;
    let latest_successful_scan = latest_successful_scan_job(&conn)?;
    let counts_by_kind = resource_kind_counts(&conn)?;
    let skip_counts_by_reason = scan_skip_reason_counts(&conn)?;

    Ok(ResourceLibrarySummary {
        source_count: count_rows(&conn, "scan_sources")?,
        enabled_source_count: scalar_count(
            &conn,
            "SELECT COUNT(*) FROM scan_sources WHERE enabled = 1",
        )?,
        job_count: count_rows(&conn, "scan_jobs")?,
        resource_count: count_rows(&conn, "resources")?,
        location_count: count_rows(&conn, "resource_locations")?,
        latest_job,
        latest_successful_scan,
        counts_by_kind,
        skip_counts_by_reason,
        skipped_entry_total: scalar_count(&conn, "SELECT COALESCE(SUM(count), 0) FROM scan_skips")?,
        error_total: scalar_count(&conn, "SELECT COUNT(*) FROM scan_errors")?,
        metadata_only: true,
        content_storage_enabled: false,
    })
}

pub fn list_persisted_resources_for_path(
    db_path: &Path,
    limit: Option<usize>,
) -> Result<Vec<PersistedResource>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let limit = normalize_limit(limit, 100);
    let mut stmt = conn.prepare(
        "SELECT
            r.id, r.stable_key, r.name, r.resource_kind, r.description, r.primary_type,
            r.risk_level, COALESCE(l.display_path, ''), l.extension, COALESCE(l.entry_type, ''),
            l.size_bytes, l.modified_at, COALESCE(l.classification_reason, ''),
            COALESCE(l.sensitive_path_redacted, 0), l.scan_source_id, l.scan_job_id
        FROM resources r
        LEFT JOIN resource_locations l ON l.id = (
            SELECT latest.id
            FROM resource_locations latest
            WHERE latest.resource_id = r.id
            ORDER BY latest.rowid DESC
            LIMIT 1
        )
        ORDER BY r.updated_at DESC, r.name ASC
        LIMIT ?1",
    )?;
    let rows = stmt.query_map(params![limit], |row| {
        Ok(PersistedResource {
            id: row.get(0)?,
            stable_key: row.get(1)?,
            name: row.get(2)?,
            resource_kind: row.get(3)?,
            description: row.get(4)?,
            primary_type: row.get(5)?,
            risk_level: row.get(6)?,
            display_path: row.get(7)?,
            extension: row.get(8)?,
            entry_type: row.get(9)?,
            size_bytes: row.get::<_, Option<i64>>(10)?.map(i64_to_u64),
            modified_at_ms: row.get::<_, Option<i64>>(11)?.map(i64_to_u64),
            classification_reason: row.get(12)?,
            sensitive_path_redacted: int_to_bool(row.get(13)?),
            scan_source_id: row.get(14)?,
            scan_job_id: row.get(15)?,
        })
    })?;

    collect_rows(rows)
}

pub fn list_resource_corpus_scopes_for_path(
    db_path: &Path,
) -> Result<Vec<ResourceCorpusScope>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let mut scopes = Vec::new();
    let total_resources = count_rows(&conn, "resources")?;
    scopes.push(ResourceCorpusScope {
        id: "global".to_string(),
        scope_kind: "global".to_string(),
        label: "全局".to_string(),
        description: "全部动态资源库元数据。".to_string(),
        resource_count: total_resources,
        project_label: None,
        scan_source_id: None,
        root_display_path: None,
        profile_id: None,
        enabled: None,
    });

    scopes.extend(list_project_scopes_for_connection(&conn)?);

    let unclassified_count = unclassified_resource_count(&conn)?;
    if unclassified_count > 0 {
        scopes.push(ResourceCorpusScope {
            id: "unclassified".to_string(),
            scope_kind: "unclassified".to_string(),
            label: "未归类".to_string(),
            description: "未设置 project/scope 标签的动态资源。".to_string(),
            resource_count: unclassified_count,
            project_label: None,
            scan_source_id: None,
            root_display_path: None,
            profile_id: None,
            enabled: None,
        });
    }

    scopes.extend(list_source_scopes_for_connection(&conn)?);
    Ok(scopes)
}

pub fn list_project_scopes_for_path(
    db_path: &Path,
) -> Result<Vec<ResourceCorpusScope>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    list_project_scopes_for_connection(&conn)
}

pub fn get_active_resource_corpus_summary_for_path(
    db_path: &Path,
) -> Result<ResourceCorpusSummary, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let counts_by_scope = get_resource_counts_by_scope_for_connection(&conn)?;

    Ok(ResourceCorpusSummary {
        source_count: count_rows(&conn, "scan_sources")?,
        enabled_source_count: scalar_count(
            &conn,
            "SELECT COUNT(*) FROM scan_sources WHERE enabled = 1",
        )?,
        project_scope_count: scalar_count(
            &conn,
            "SELECT COUNT(DISTINCT project_label)
            FROM scan_sources
            WHERE project_label IS NOT NULL AND TRIM(project_label) <> ''",
        )?,
        resource_count: count_rows(&conn, "resources")?,
        location_count: count_rows(&conn, "resource_locations")?,
        latest_successful_scan: latest_successful_scan_job(&conn)?,
        counts_by_kind: resource_kind_counts(&conn)?,
        counts_by_scope,
        skipped_entry_total: scalar_count(&conn, "SELECT COALESCE(SUM(count), 0) FROM scan_skips")?,
        error_total: scalar_count(&conn, "SELECT COUNT(*) FROM scan_errors")?,
        metadata_only: true,
        content_storage_enabled: false,
    })
}

pub fn list_resources_by_scope_for_path(
    db_path: &Path,
    query: ResourceCorpusQuery,
) -> Result<Vec<ResourceCorpusResource>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let filter = ScopeFilter::from_query(&conn, &query)?;
    query_corpus_resources(&conn, &filter, query.limit, query.offset)
}

pub fn list_resources_by_kind_for_path(
    db_path: &Path,
    resource_kind: &str,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<ResourceCorpusResource>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let filter = ScopeFilter {
        kind: ScopeFilterKind::Global,
        resource_kind: normalized_optional_text(Some(resource_kind)),
    };
    query_corpus_resources(&conn, &filter, limit, offset)
}

pub fn get_resource_detail_for_path(
    db_path: &Path,
    resource_id: &str,
) -> Result<ResourceCorpusDetail, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let resource_id = normalized_required_text("资源 ID", resource_id)?;
    let filter = ScopeFilter {
        kind: ScopeFilterKind::Global,
        resource_kind: None,
    };
    let resource = query_corpus_resource_by_id(&conn, &filter, &resource_id)?
        .ok_or_else(|| ResourceStoreError::InvalidInput("未找到资源详情。".to_string()))?;
    let locations = list_resource_locations_for_connection(&conn, &resource_id)?;
    let findings = list_resource_findings_for_connection(&conn, &resource_id)?;

    Ok(ResourceCorpusDetail {
        resource,
        locations,
        findings,
        metadata_only: true,
        content_storage_enabled: false,
    })
}

pub fn get_resource_counts_by_scope_for_path(
    db_path: &Path,
) -> Result<Vec<ResourceScopeCount>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    get_resource_counts_by_scope_for_connection(&conn)
}

pub fn get_scan_source_for_path(
    db_path: &Path,
    source_id: &str,
) -> Result<PersistedScanSource, ResourceStoreError> {
    let sources = list_scan_sources_for_path(db_path)?;
    sources
        .into_iter()
        .find(|source| source.id == source_id)
        .ok_or_else(|| ResourceStoreError::InvalidInput("未找到扫描来源。".to_string()))
}

pub fn list_stored_scan_sources_for_path(
    db_path: &Path,
    source_ids: &[String],
) -> Result<Vec<StoredScanSource>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let mut sources = Vec::new();
    for source_id in source_ids {
        let normalized_id = normalized_required_text("扫描来源 ID", source_id)?;
        if let Some(source) = stored_scan_source_by_id(&conn, &normalized_id)? {
            sources.push(source);
        }
    }
    Ok(sources)
}

pub fn list_enabled_stored_scan_sources_for_path(
    db_path: &Path,
    source_ids: &[String],
) -> Result<Vec<StoredScanSource>, ResourceStoreError> {
    Ok(list_stored_scan_sources_for_path(db_path, source_ids)?
        .into_iter()
        .filter(|source| source.enabled)
        .collect())
}

pub fn clear_resource_library_for_path(
    db_path: &Path,
) -> Result<ResourceLibrarySummary, ResourceStoreError> {
    let mut conn = open_initialized_connection(db_path)?;
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM resource_findings", [])?;
    tx.execute("DELETE FROM resource_locations", [])?;
    tx.execute("DELETE FROM resources", [])?;
    tx.execute("DELETE FROM scan_errors", [])?;
    tx.execute("DELETE FROM scan_skips", [])?;
    tx.execute("DELETE FROM scan_job_sources", [])?;
    tx.execute("DELETE FROM scan_jobs", [])?;
    tx.execute("DELETE FROM scan_sources", [])?;
    tx.execute("DELETE FROM project_scopes", [])?;
    tx.execute("DELETE FROM app_settings", [])?;
    tx.commit()?;

    get_library_summary_for_path(db_path)
}

fn open_raw_connection(db_path: &Path) -> Result<Connection, ResourceStoreError> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    Ok(conn)
}

fn open_initialized_connection(db_path: &Path) -> Result<Connection, ResourceStoreError> {
    let conn = open_raw_connection(db_path)?;
    migrate_v1(&conn)?;
    migrate_v2(&conn)?;
    migrate_v3(&conn)?;
    Ok(conn)
}

fn migrate_v1(conn: &Connection) -> Result<(), ResourceStoreError> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scan_sources (
            id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            root_path TEXT NOT NULL,
            root_display_path TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            source_kind TEXT NOT NULL,
            project_label TEXT,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            last_scan_job_id TEXT
        );

        CREATE TABLE IF NOT EXISTS scan_jobs (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            started_at INTEGER NOT NULL,
            finished_at INTEGER,
            elapsed_ms INTEGER NOT NULL,
            requested_by TEXT NOT NULL,
            total_entries INTEGER NOT NULL,
            matched_resources INTEGER NOT NULL,
            skipped_entries INTEGER NOT NULL,
            error_count INTEGER NOT NULL,
            cancelled INTEGER NOT NULL DEFAULT 0,
            summary_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scan_job_sources (
            scan_job_id TEXT NOT NULL,
            scan_source_id TEXT NOT NULL,
            root_display_path TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            PRIMARY KEY (scan_job_id, scan_source_id),
            FOREIGN KEY (scan_job_id) REFERENCES scan_jobs(id) ON DELETE CASCADE,
            FOREIGN KEY (scan_source_id) REFERENCES scan_sources(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS resources (
            id TEXT PRIMARY KEY,
            stable_key TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            resource_kind TEXT NOT NULL,
            description TEXT NOT NULL,
            primary_type TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            boundary_labels_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS resource_locations (
            id TEXT PRIMARY KEY,
            resource_id TEXT NOT NULL,
            scan_source_id TEXT NOT NULL,
            scan_job_id TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            display_path TEXT NOT NULL,
            extension TEXT,
            entry_type TEXT NOT NULL,
            size_bytes INTEGER,
            modified_at INTEGER,
            classification_reason TEXT NOT NULL,
            sensitive_path_redacted INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
            FOREIGN KEY (scan_source_id) REFERENCES scan_sources(id) ON DELETE CASCADE,
            FOREIGN KEY (scan_job_id) REFERENCES scan_jobs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS resource_findings (
            id TEXT PRIMARY KEY,
            resource_id TEXT NOT NULL,
            scan_job_id TEXT NOT NULL,
            finding_kind TEXT NOT NULL,
            severity TEXT NOT NULL,
            message TEXT NOT NULL,
            safe_detail_json TEXT NOT NULL,
            FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
            FOREIGN KEY (scan_job_id) REFERENCES scan_jobs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS scan_skips (
            id TEXT PRIMARY KEY,
            scan_job_id TEXT NOT NULL,
            scan_source_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            count INTEGER NOT NULL,
            sample_safe_path TEXT,
            FOREIGN KEY (scan_job_id) REFERENCES scan_jobs(id) ON DELETE CASCADE,
            FOREIGN KEY (scan_source_id) REFERENCES scan_sources(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS scan_errors (
            id TEXT PRIMARY KEY,
            scan_job_id TEXT NOT NULL,
            scan_source_id TEXT NOT NULL,
            error_kind TEXT NOT NULL,
            message TEXT NOT NULL,
            sample_safe_path TEXT,
            FOREIGN KEY (scan_job_id) REFERENCES scan_jobs(id) ON DELETE CASCADE,
            FOREIGN KEY (scan_source_id) REFERENCES scan_sources(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS project_scopes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            root_path TEXT NOT NULL,
            root_display_path TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_scan_jobs_started_at ON scan_jobs(started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_scan_sources_root_kind ON scan_sources(root_path, source_kind);
        CREATE INDEX IF NOT EXISTS idx_resources_kind ON resources(resource_kind);
        CREATE INDEX IF NOT EXISTS idx_resource_locations_resource ON resource_locations(resource_id);
        CREATE INDEX IF NOT EXISTS idx_resource_locations_job ON resource_locations(scan_job_id);
        CREATE INDEX IF NOT EXISTS idx_scan_skips_job ON scan_skips(scan_job_id);
        CREATE INDEX IF NOT EXISTS idx_scan_errors_job ON scan_errors(scan_job_id);
        ",
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?1, ?2)",
        params![1_i64, u64_to_i64(current_time_ms())],
    )?;
    Ok(())
}

fn migrate_v2(conn: &Connection) -> Result<(), ResourceStoreError> {
    if !column_exists(conn, "scan_sources", "project_label")? {
        conn.execute("ALTER TABLE scan_sources ADD COLUMN project_label TEXT", [])?;
    }
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_scan_sources_root_kind ON scan_sources(root_path, source_kind)",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?1, ?2)",
        params![SCHEMA_VERSION, u64_to_i64(current_time_ms())],
    )?;
    Ok(())
}

fn migrate_v3(conn: &Connection) -> Result<(), ResourceStoreError> {
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_scan_sources_project_label ON scan_sources(project_label)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_resource_locations_source ON resource_locations(scan_source_id)",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?1, ?2)",
        params![SCHEMA_VERSION, u64_to_i64(current_time_ms())],
    )?;
    Ok(())
}

fn column_exists(
    conn: &Connection,
    table_name: &str,
    column_name: &str,
) -> Result<bool, ResourceStoreError> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table_name})"))?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
    for row in rows {
        if row? == column_name {
            return Ok(true);
        }
    }
    Ok(false)
}

fn latest_scan_job(conn: &Connection) -> Result<Option<PersistedScanJob>, ResourceStoreError> {
    conn.query_row(
        "SELECT
            j.id, j.status, j.profile_id, j.started_at, j.finished_at, j.elapsed_ms,
            j.requested_by, j.total_entries, j.matched_resources, j.skipped_entries,
            j.error_count, j.cancelled, COALESCE(js.root_display_path, '')
        FROM scan_jobs j
        LEFT JOIN scan_job_sources js ON js.scan_job_id = j.id
        ORDER BY j.started_at DESC
        LIMIT 1",
        [],
        row_to_scan_job,
    )
    .optional()
    .map_err(ResourceStoreError::from)
}

fn latest_successful_scan_job(
    conn: &Connection,
) -> Result<Option<PersistedScanJob>, ResourceStoreError> {
    conn.query_row(
        "SELECT
            j.id, j.status, j.profile_id, j.started_at, j.finished_at, j.elapsed_ms,
            j.requested_by, j.total_entries, j.matched_resources, j.skipped_entries,
            j.error_count, j.cancelled, COALESCE(js.root_display_path, '')
        FROM scan_jobs j
        LEFT JOIN scan_job_sources js ON js.scan_job_id = j.id
        WHERE j.status = 'completed'
        ORDER BY j.finished_at DESC, j.started_at DESC
        LIMIT 1",
        [],
        row_to_scan_job,
    )
    .optional()
    .map_err(ResourceStoreError::from)
}

fn upsert_scan_source_tx(
    conn: &Connection,
    source_id: &str,
    display_name: &str,
    root_path: &str,
    root_display_path: &str,
    profile_id: &str,
    source_kind: &str,
    project_label: Option<&str>,
    enabled: bool,
    now: u64,
    last_scan_job_id: Option<&str>,
) -> Result<(), ResourceStoreError> {
    let existing_created_at = conn
        .query_row(
            "SELECT created_at FROM scan_sources WHERE id = ?1",
            params![source_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
        .map(i64_to_u64)
        .unwrap_or(now);
    conn.execute(
        "INSERT INTO scan_sources (
            id, display_name, root_path, root_display_path, profile_id, source_kind,
            project_label, enabled, created_at, updated_at, last_scan_job_id
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ON CONFLICT(id) DO UPDATE SET
            display_name = excluded.display_name,
            root_path = excluded.root_path,
            root_display_path = excluded.root_display_path,
            profile_id = excluded.profile_id,
            source_kind = excluded.source_kind,
            project_label = excluded.project_label,
            enabled = excluded.enabled,
            updated_at = excluded.updated_at,
            last_scan_job_id = COALESCE(excluded.last_scan_job_id, scan_sources.last_scan_job_id)",
        params![
            source_id,
            display_name,
            root_path,
            root_display_path,
            profile_id,
            source_kind,
            project_label,
            bool_to_i64(enabled),
            u64_to_i64(existing_created_at),
            u64_to_i64(now),
            last_scan_job_id,
        ],
    )?;
    Ok(())
}

fn upsert_project_scope_tx(
    conn: &Connection,
    source_kind: &str,
    root_path: &str,
    name: &str,
    root_display_path: &str,
    profile_id: &str,
    now: u64,
) -> Result<(), ResourceStoreError> {
    let project_scope_id = stable_id("project-scope", &[source_kind, root_path]);
    conn.execute(
        "INSERT INTO project_scopes (
            id, name, root_path, root_display_path, profile_id, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            root_path = excluded.root_path,
            root_display_path = excluded.root_display_path,
            profile_id = excluded.profile_id,
            updated_at = excluded.updated_at",
        params![
            project_scope_id,
            name,
            root_path,
            root_display_path,
            profile_id,
            u64_to_i64(now)
        ],
    )?;
    Ok(())
}

fn scan_source_id_for_persist_input(
    conn: &Connection,
    input: &PersistScanSourceInput,
) -> Result<String, ResourceStoreError> {
    if let Some(source_id) = normalized_optional_text(input.id.as_deref()) {
        return Ok(source_id);
    }
    source_id_for_root(conn, &input.root_path, &input.source_kind).map(|existing| {
        existing
            .unwrap_or_else(|| stable_id("scan-source", &[&input.source_kind, &input.root_path]))
    })
}

fn scan_source_id_for_input(
    conn: &Connection,
    requested_id: Option<&str>,
    input: &UpsertScanSourceInput,
) -> Result<String, ResourceStoreError> {
    if let Some(source_id) = normalized_optional_text(requested_id) {
        return Ok(source_id);
    }
    source_id_for_root(conn, &input.root_path, &input.source_kind).map(|existing| {
        existing
            .unwrap_or_else(|| stable_id("scan-source", &[&input.source_kind, &input.root_path]))
    })
}

fn source_id_for_root(
    conn: &Connection,
    root_path: &str,
    source_kind: &str,
) -> Result<Option<String>, ResourceStoreError> {
    conn.query_row(
        "SELECT id FROM scan_sources
        WHERE root_path = ?1 AND source_kind = ?2
        ORDER BY updated_at DESC
        LIMIT 1",
        params![root_path, source_kind],
        |row| row.get(0),
    )
    .optional()
    .map_err(ResourceStoreError::from)
}

fn stored_scan_source_by_id(
    conn: &Connection,
    source_id: &str,
) -> Result<Option<StoredScanSource>, ResourceStoreError> {
    conn.query_row(
        "SELECT id, display_name, root_path, root_display_path, profile_id, source_kind,
            project_label, enabled
        FROM scan_sources
        WHERE id = ?1",
        params![source_id],
        |row| {
            Ok(StoredScanSource {
                id: row.get(0)?,
                display_name: row.get(1)?,
                root_path: row.get(2)?,
                root_display_path: row.get(3)?,
                profile_id: row.get(4)?,
                source_kind: row.get(5)?,
                project_label: row.get(6)?,
                enabled: int_to_bool(row.get(7)?),
            })
        },
    )
    .optional()
    .map_err(ResourceStoreError::from)
}

fn source_job_ids(conn: &Connection, source_id: &str) -> Result<Vec<String>, ResourceStoreError> {
    let mut stmt =
        conn.prepare("SELECT scan_job_id FROM scan_job_sources WHERE scan_source_id = ?1")?;
    let rows = stmt.query_map(params![source_id], |row| row.get::<_, String>(0))?;
    collect_rows(rows)
}

fn row_to_scan_job(row: &rusqlite::Row<'_>) -> rusqlite::Result<PersistedScanJob> {
    Ok(PersistedScanJob {
        id: row.get(0)?,
        status: row.get(1)?,
        profile_id: row.get(2)?,
        started_at_ms: i64_to_u64(row.get(3)?),
        finished_at_ms: row.get::<_, Option<i64>>(4)?.map(i64_to_u64),
        elapsed_ms: i64_to_u64(row.get(5)?),
        requested_by: row.get(6)?,
        total_entries: i64_to_u64(row.get(7)?),
        matched_resources: i64_to_u64(row.get(8)?),
        skipped_entries: i64_to_u64(row.get(9)?),
        error_count: i64_to_u64(row.get(10)?),
        cancelled: int_to_bool(row.get(11)?),
        root_display_path: row.get(12)?,
    })
}

fn row_to_app_setting(row: &rusqlite::Row<'_>) -> rusqlite::Result<AppSettingRecord> {
    Ok(AppSettingRecord {
        key: row.get(0)?,
        value_json: row.get(1)?,
        updated_at_ms: i64_to_u64(row.get(2)?),
    })
}

fn resource_kind_counts(conn: &Connection) -> Result<Vec<ResourceKindCount>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT resource_kind, COUNT(*)
        FROM resources
        GROUP BY resource_kind
        ORDER BY COUNT(*) DESC, resource_kind ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(ResourceKindCount {
            resource_kind: row.get(0)?,
            count: i64_to_u64(row.get(1)?),
        })
    })?;
    collect_rows(rows)
}

fn scan_skip_reason_counts(
    conn: &Connection,
) -> Result<Vec<ScanSkipReasonCount>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT reason, COALESCE(SUM(count), 0)
        FROM scan_skips
        GROUP BY reason
        ORDER BY reason ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(ScanSkipReasonCount {
            reason: row.get(0)?,
            count: i64_to_u64(row.get(1)?),
        })
    })?;
    collect_rows(rows)
}

fn schema_version(conn: &Connection) -> Result<i64, ResourceStoreError> {
    conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |row| row.get(0),
    )
    .map_err(ResourceStoreError::from)
}

fn count_rows(conn: &Connection, table_name: &str) -> Result<u64, ResourceStoreError> {
    let sql = match table_name {
        "scan_sources" => "SELECT COUNT(*) FROM scan_sources",
        "scan_jobs" => "SELECT COUNT(*) FROM scan_jobs",
        "resources" => "SELECT COUNT(*) FROM resources",
        "resource_locations" => "SELECT COUNT(*) FROM resource_locations",
        _ => "SELECT 0",
    };
    conn.query_row(sql, [], |row| row.get::<_, i64>(0))
        .map(i64_to_u64)
        .map_err(ResourceStoreError::from)
}

fn scalar_count(conn: &Connection, sql: &str) -> Result<u64, ResourceStoreError> {
    conn.query_row(sql, [], |row| row.get::<_, i64>(0))
        .map(i64_to_u64)
        .map_err(ResourceStoreError::from)
}

#[derive(Clone, Debug)]
struct ScopeFilter {
    kind: ScopeFilterKind,
    resource_kind: Option<String>,
}

#[derive(Clone, Debug)]
enum ScopeFilterKind {
    Global,
    Project(String),
    Source(String),
    Unclassified,
}

impl ScopeFilter {
    fn from_query(
        conn: &Connection,
        query: &ResourceCorpusQuery,
    ) -> Result<Self, ResourceStoreError> {
        let scope_kind = normalized_optional_text(query.scope_kind.as_deref())
            .unwrap_or_else(|| "global".to_string())
            .to_ascii_lowercase();
        let kind = match scope_kind.as_str() {
            "global" => ScopeFilterKind::Global,
            "project" => {
                let project_label = normalized_optional_text(query.project_label.as_deref())
                    .or_else(|| {
                        query.scope_id.as_deref().and_then(|scope_id| {
                            project_label_for_scope_id(conn, scope_id).ok().flatten()
                        })
                    })
                    .ok_or_else(|| {
                        ResourceStoreError::InvalidInput(
                            "项目 scope 缺少 projectLabel。".to_string(),
                        )
                    })?;
                ScopeFilterKind::Project(project_label)
            }
            "source" => {
                let source_id = normalized_optional_text(query.scan_source_id.as_deref())
                    .or_else(|| normalized_optional_text(query.scope_id.as_deref()))
                    .ok_or_else(|| {
                        ResourceStoreError::InvalidInput(
                            "来源 scope 缺少 scanSourceId。".to_string(),
                        )
                    })?;
                ScopeFilterKind::Source(source_id)
            }
            "unclassified" => ScopeFilterKind::Unclassified,
            _ => {
                return Err(ResourceStoreError::InvalidInput(
                    "未知资源 scope 类型。".to_string(),
                ))
            }
        };

        Ok(Self {
            kind,
            resource_kind: normalized_optional_text(query.resource_kind.as_deref()),
        })
    }
}

fn query_corpus_resources(
    conn: &Connection,
    filter: &ScopeFilter,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<ResourceCorpusResource>, ResourceStoreError> {
    let mut values = Vec::new();
    let mut clauses = Vec::new();
    apply_scope_filter(filter, &mut clauses, &mut values);

    let mut sql = corpus_resource_base_sql();
    if !clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&clauses.join(" AND "));
    }
    sql.push_str(
        " ORDER BY
            COALESCE(NULLIF(TRIM(s.project_label), ''), '未归类') ASC,
            r.resource_kind ASC,
            r.name ASC,
            COALESCE(l.relative_path, '') ASC
        LIMIT ? OFFSET ?",
    );
    values.push(Value::Integer(normalize_resource_query_limit(limit)));
    values.push(Value::Integer(normalize_offset(offset)));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(values), row_to_corpus_resource)?;
    collect_rows(rows)
}

fn query_corpus_resource_by_id(
    conn: &Connection,
    filter: &ScopeFilter,
    resource_id: &str,
) -> Result<Option<ResourceCorpusResource>, ResourceStoreError> {
    let mut values = Vec::new();
    let mut clauses = vec!["r.id = ?".to_string()];
    values.push(Value::Text(resource_id.to_string()));
    apply_scope_filter(filter, &mut clauses, &mut values);

    let mut sql = corpus_resource_base_sql();
    sql.push_str(" WHERE ");
    sql.push_str(&clauses.join(" AND "));
    sql.push_str(" LIMIT 1");

    conn.query_row(&sql, params_from_iter(values), row_to_corpus_resource)
        .optional()
        .map_err(ResourceStoreError::from)
}

fn corpus_resource_base_sql() -> String {
    "
    SELECT
        r.id, r.stable_key, r.name, r.resource_kind, r.description, r.primary_type,
        r.risk_level, r.boundary_labels_json, r.updated_at,
        l.id, l.scan_source_id, s.display_name, s.source_kind, s.enabled,
        s.project_label, s.root_display_path, s.profile_id,
        l.scan_job_id, j.status, j.started_at, j.finished_at,
        l.relative_path, l.display_path, l.extension, l.entry_type,
        l.size_bytes, l.modified_at, l.classification_reason,
        COALESCE(l.sensitive_path_redacted, 0)
    FROM resources r
    LEFT JOIN resource_locations l ON l.id = (
        SELECT latest.id
        FROM resource_locations latest
        LEFT JOIN scan_jobs latest_job ON latest_job.id = latest.scan_job_id
        WHERE latest.resource_id = r.id
        ORDER BY latest_job.finished_at DESC, latest_job.started_at DESC, latest.rowid DESC
        LIMIT 1
    )
    LEFT JOIN scan_sources s ON s.id = l.scan_source_id
    LEFT JOIN scan_jobs j ON j.id = l.scan_job_id"
        .to_string()
}

fn apply_scope_filter(filter: &ScopeFilter, clauses: &mut Vec<String>, values: &mut Vec<Value>) {
    match &filter.kind {
        ScopeFilterKind::Global => {}
        ScopeFilterKind::Project(project_label) => {
            clauses.push("COALESCE(TRIM(s.project_label), '') = ?".to_string());
            values.push(Value::Text(project_label.to_string()));
        }
        ScopeFilterKind::Source(source_id) => {
            clauses.push("s.id = ?".to_string());
            values.push(Value::Text(source_id.to_string()));
        }
        ScopeFilterKind::Unclassified => {
            clauses.push("(s.project_label IS NULL OR TRIM(s.project_label) = '')".to_string());
        }
    }

    if let Some(resource_kind) = &filter.resource_kind {
        clauses.push("r.resource_kind = ?".to_string());
        values.push(Value::Text(resource_kind.to_string()));
    }
}

fn row_to_corpus_resource(row: &rusqlite::Row<'_>) -> rusqlite::Result<ResourceCorpusResource> {
    let boundary_labels_json: String = row.get(7)?;
    let boundary_labels =
        serde_json::from_str::<Vec<String>>(&boundary_labels_json).unwrap_or_default();
    Ok(ResourceCorpusResource {
        id: row.get(0)?,
        stable_key: row.get(1)?,
        name: row.get(2)?,
        resource_kind: row.get(3)?,
        description: row.get(4)?,
        primary_type: row.get(5)?,
        risk_level: row.get(6)?,
        boundary_labels,
        updated_at_ms: i64_to_u64(row.get(8)?),
        location_id: row.get(9)?,
        scan_source_id: row.get(10)?,
        scan_source_name: row.get(11)?,
        source_kind: row.get(12)?,
        scan_source_enabled: row.get::<_, Option<i64>>(13)?.map(int_to_bool),
        project_label: row.get(14)?,
        root_display_path: row.get(15)?,
        profile_id: row.get(16)?,
        scan_job_id: row.get(17)?,
        scan_job_status: row.get(18)?,
        scan_job_started_at_ms: row.get::<_, Option<i64>>(19)?.map(i64_to_u64),
        scan_job_finished_at_ms: row.get::<_, Option<i64>>(20)?.map(i64_to_u64),
        relative_path: row.get(21)?,
        display_path: row.get(22)?,
        extension: row.get(23)?,
        entry_type: row.get(24)?,
        size_bytes: row.get::<_, Option<i64>>(25)?.map(i64_to_u64),
        modified_at_ms: row.get::<_, Option<i64>>(26)?.map(i64_to_u64),
        classification_reason: row.get(27)?,
        sensitive_path_redacted: int_to_bool(row.get(28)?),
    })
}

fn list_project_scopes_for_connection(
    conn: &Connection,
) -> Result<Vec<ResourceCorpusScope>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT
            s.project_label,
            COUNT(DISTINCT l.resource_id),
            MIN(s.root_display_path),
            MIN(s.profile_id)
        FROM scan_sources s
        LEFT JOIN resource_locations l ON l.scan_source_id = s.id
        WHERE s.project_label IS NOT NULL AND TRIM(s.project_label) <> ''
        GROUP BY s.project_label
        ORDER BY s.project_label ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        let label: String = row.get(0)?;
        Ok(ResourceCorpusScope {
            id: project_label_scope_id(&label),
            scope_kind: "project".to_string(),
            label: label.clone(),
            description: format!("项目 scope：{label}"),
            resource_count: i64_to_u64(row.get(1)?),
            project_label: Some(label),
            scan_source_id: None,
            root_display_path: row.get(2)?,
            profile_id: row.get(3)?,
            enabled: None,
        })
    })?;
    collect_rows(rows)
}

fn list_source_scopes_for_connection(
    conn: &Connection,
) -> Result<Vec<ResourceCorpusScope>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT
            s.id, s.display_name, s.root_display_path, s.profile_id, s.project_label,
            s.enabled, COUNT(DISTINCT l.resource_id)
        FROM scan_sources s
        LEFT JOIN resource_locations l ON l.scan_source_id = s.id
        GROUP BY s.id
        ORDER BY COALESCE(NULLIF(TRIM(s.project_label), ''), '未归类') ASC,
            s.display_name ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        let source_id: String = row.get(0)?;
        let display_name: String = row.get(1)?;
        let root_display_path: String = row.get(2)?;
        Ok(ResourceCorpusScope {
            id: source_scope_id(&source_id),
            scope_kind: "source".to_string(),
            label: display_name,
            description: root_display_path.clone(),
            resource_count: i64_to_u64(row.get(6)?),
            project_label: row.get(4)?,
            scan_source_id: Some(source_id),
            root_display_path: Some(root_display_path),
            profile_id: row.get(3)?,
            enabled: Some(int_to_bool(row.get(5)?)),
        })
    })?;
    collect_rows(rows)
}

fn get_resource_counts_by_scope_for_connection(
    conn: &Connection,
) -> Result<Vec<ResourceScopeCount>, ResourceStoreError> {
    let mut counts = Vec::new();
    counts.push(ResourceScopeCount {
        scope_id: "global".to_string(),
        scope_kind: "global".to_string(),
        label: "全局".to_string(),
        count: count_rows(conn, "resources")?,
    });

    for scope in list_project_scopes_for_connection(conn)? {
        counts.push(ResourceScopeCount {
            scope_id: scope.id,
            scope_kind: scope.scope_kind,
            label: scope.label,
            count: scope.resource_count,
        });
    }

    let unclassified = unclassified_resource_count(conn)?;
    if unclassified > 0 {
        counts.push(ResourceScopeCount {
            scope_id: "unclassified".to_string(),
            scope_kind: "unclassified".to_string(),
            label: "未归类".to_string(),
            count: unclassified,
        });
    }

    for scope in list_source_scopes_for_connection(conn)? {
        counts.push(ResourceScopeCount {
            scope_id: scope.id,
            scope_kind: scope.scope_kind,
            label: scope.label,
            count: scope.resource_count,
        });
    }

    Ok(counts)
}

fn list_resource_locations_for_connection(
    conn: &Connection,
    resource_id: &str,
) -> Result<Vec<ResourceCorpusLocation>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT
            l.id, l.scan_source_id, s.display_name, s.project_label, s.root_display_path,
            s.profile_id, l.scan_job_id, j.status, l.relative_path, l.display_path,
            l.extension, l.entry_type, l.size_bytes, l.modified_at, l.classification_reason,
            l.sensitive_path_redacted
        FROM resource_locations l
        JOIN scan_sources s ON s.id = l.scan_source_id
        JOIN scan_jobs j ON j.id = l.scan_job_id
        WHERE l.resource_id = ?1
        ORDER BY COALESCE(NULLIF(TRIM(s.project_label), ''), '未归类') ASC,
            s.display_name ASC, l.relative_path ASC, j.started_at DESC",
    )?;
    let rows = stmt.query_map(params![resource_id], |row| {
        Ok(ResourceCorpusLocation {
            id: row.get(0)?,
            scan_source_id: row.get(1)?,
            scan_source_name: row.get(2)?,
            project_label: row.get(3)?,
            root_display_path: row.get(4)?,
            profile_id: row.get(5)?,
            scan_job_id: row.get(6)?,
            scan_job_status: row.get(7)?,
            relative_path: row.get(8)?,
            display_path: row.get(9)?,
            extension: row.get(10)?,
            entry_type: row.get(11)?,
            size_bytes: row.get::<_, Option<i64>>(12)?.map(i64_to_u64),
            modified_at_ms: row.get::<_, Option<i64>>(13)?.map(i64_to_u64),
            classification_reason: row.get(14)?,
            sensitive_path_redacted: int_to_bool(row.get(15)?),
        })
    })?;
    collect_rows(rows)
}

fn list_resource_findings_for_connection(
    conn: &Connection,
    resource_id: &str,
) -> Result<Vec<ResourceCorpusFinding>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT id, scan_job_id, finding_kind, severity, message, safe_detail_json
        FROM resource_findings
        WHERE resource_id = ?1
        ORDER BY severity DESC, finding_kind ASC",
    )?;
    let rows = stmt.query_map(params![resource_id], |row| {
        Ok(ResourceCorpusFinding {
            id: row.get(0)?,
            scan_job_id: row.get(1)?,
            finding_kind: row.get(2)?,
            severity: row.get(3)?,
            message: row.get(4)?,
            safe_detail_json: row.get(5)?,
        })
    })?;
    collect_rows(rows)
}

fn project_label_for_scope_id(
    conn: &Connection,
    scope_id: &str,
) -> Result<Option<String>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT project_label
        FROM scan_sources
        WHERE project_label IS NOT NULL AND TRIM(project_label) <> ''",
    )?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    for row in rows {
        let label = row?;
        if project_label_scope_id(&label) == scope_id {
            return Ok(Some(label));
        }
    }
    Ok(None)
}

fn unclassified_resource_count(conn: &Connection) -> Result<u64, ResourceStoreError> {
    conn.query_row(
        "SELECT COUNT(DISTINCT l.resource_id)
        FROM resource_locations l
        JOIN scan_sources s ON s.id = l.scan_source_id
        WHERE s.project_label IS NULL OR TRIM(s.project_label) = ''",
        [],
        |row| row.get::<_, i64>(0),
    )
    .map(i64_to_u64)
    .map_err(ResourceStoreError::from)
}

fn project_label_scope_id(project_label: &str) -> String {
    stable_id("project-scope", &[project_label])
}

fn source_scope_id(source_id: &str) -> String {
    format!("source:{source_id}")
}

fn normalize_resource_query_limit(limit: Option<usize>) -> i64 {
    i64::try_from(
        limit
            .unwrap_or(DEFAULT_RESOURCE_QUERY_LIMIT)
            .clamp(1, MAX_RESOURCE_QUERY_LIMIT),
    )
    .unwrap_or(MAX_RESOURCE_QUERY_LIMIT as i64)
}

fn normalize_offset(offset: Option<usize>) -> i64 {
    i64::try_from(offset.unwrap_or(0)).unwrap_or(i64::MAX)
}

fn validate_source_input(
    display_name: &str,
    root_path: &str,
    root_display_path: &str,
    profile_id: &str,
    source_kind: &str,
) -> Result<(), ResourceStoreError> {
    normalized_required_text("扫描来源名称", display_name)?;
    normalized_required_text("扫描来源路径", root_path)?;
    normalized_required_text("扫描来源显示路径", root_display_path)?;
    normalized_required_text("扫描模板", profile_id)?;
    normalized_required_text("扫描来源类型", source_kind)?;
    Ok(())
}

fn normalized_required_text(label: &str, value: &str) -> Result<String, ResourceStoreError> {
    normalized_optional_text(Some(value))
        .ok_or_else(|| ResourceStoreError::InvalidInput(format!("{label}不能为空。")))
}

fn normalized_optional_text(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn findings_for_resource(resource: &PersistScanResourceInput) -> Vec<ResourceFindingInput> {
    let mut findings = Vec::new();
    if resource.sensitive_path_redacted
        || resource
            .risk_labels
            .iter()
            .any(|label| label == "sensitive-path-redacted")
    {
        findings.push(ResourceFindingInput {
            finding_kind: "sensitive-path-redacted",
            severity: "medium",
            message: "敏感命名路径段已隐藏。",
            safe_detail_json: "{\"metadataOnly\":true,\"contentStored\":false}",
        });
    }
    if resource
        .risk_labels
        .iter()
        .any(|label| label == "execution-disabled")
    {
        findings.push(ResourceFindingInput {
            finding_kind: "execution-disabled",
            severity: "low",
            message: "脚本或验证器仅作为元数据保存，未执行。",
            safe_detail_json: "{\"executionEnabled\":false}",
        });
    }
    if resource
        .risk_labels
        .iter()
        .any(|label| label == "mcp-not-executed")
    {
        findings.push(ResourceFindingInput {
            finding_kind: "mcp-not-executed",
            severity: "low",
            message: "MCP 配置仅作为元数据保存，未启动或连接。",
            safe_detail_json: "{\"mcpExecuted\":false}",
        });
    }
    findings
}

struct ResourceFindingInput {
    finding_kind: &'static str,
    severity: &'static str,
    message: &'static str,
    safe_detail_json: &'static str,
}

fn stable_resource_key(
    source_id: &str,
    profile_id: &str,
    resource_kind: &str,
    relative_path: &str,
) -> String {
    format!("{source_id}\u{1f}{profile_id}\u{1f}{resource_kind}\u{1f}{relative_path}")
}

fn stable_id(prefix: &str, parts: &[&str]) -> String {
    let mut hash = 0xcbf29ce484222325_u64;
    for part in parts {
        for byte in part.as_bytes() {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x100000001b3);
        }
        hash ^= 0xff;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{prefix}:{hash:016x}")
}

fn collect_rows<T>(
    rows: rusqlite::MappedRows<'_, impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>>,
) -> Result<Vec<T>, ResourceStoreError> {
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(ResourceStoreError::from)
}

fn normalize_limit(limit: Option<usize>, fallback: usize) -> i64 {
    limit.unwrap_or(fallback).clamp(1, 500) as i64
}

fn normalize_app_setting_key(key: &str) -> Result<String, ResourceStoreError> {
    let key = key.trim();
    if key.is_empty() || key.len() > 128 {
        return Err(ResourceStoreError::InvalidInput(
            "app setting key must be 1-128 characters".to_string(),
        ));
    }
    if !key
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '_' | '-' | '.'))
    {
        return Err(ResourceStoreError::InvalidInput(
            "app setting key contains unsupported characters".to_string(),
        ));
    }
    Ok(key.to_string())
}

fn bool_to_i64(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn int_to_bool(value: i64) -> bool {
    value != 0
}

fn u64_to_i64(value: u64) -> i64 {
    value.min(i64::MAX as u64) as i64
}

fn i64_to_u64(value: i64) -> u64 {
    value.max(0) as u64
}

fn current_time_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().min(u64::MAX as u128) as u64)
        .unwrap_or_default()
}

#[cfg(test)]
pub fn debug_all_text_values_for_path(db_path: &Path) -> Result<String, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let mut values = Vec::new();
    for table in [
        ("app_settings", vec!["key", "value_json"]),
        (
            "scan_sources",
            vec![
                "id",
                "display_name",
                "root_path",
                "root_display_path",
                "profile_id",
                "source_kind",
                "project_label",
            ],
        ),
        (
            "scan_jobs",
            vec!["id", "status", "profile_id", "requested_by", "summary_json"],
        ),
        (
            "scan_job_sources",
            vec![
                "scan_job_id",
                "scan_source_id",
                "root_display_path",
                "profile_id",
            ],
        ),
        (
            "resources",
            vec![
                "id",
                "stable_key",
                "name",
                "resource_kind",
                "description",
                "primary_type",
                "risk_level",
                "boundary_labels_json",
            ],
        ),
        (
            "resource_locations",
            vec![
                "id",
                "resource_id",
                "scan_source_id",
                "scan_job_id",
                "relative_path",
                "display_path",
                "extension",
                "entry_type",
                "classification_reason",
            ],
        ),
        (
            "resource_findings",
            vec![
                "id",
                "resource_id",
                "scan_job_id",
                "finding_kind",
                "severity",
                "message",
                "safe_detail_json",
            ],
        ),
        (
            "scan_skips",
            vec![
                "id",
                "scan_job_id",
                "scan_source_id",
                "reason",
                "sample_safe_path",
            ],
        ),
        (
            "scan_errors",
            vec![
                "id",
                "scan_job_id",
                "scan_source_id",
                "error_kind",
                "message",
                "sample_safe_path",
            ],
        ),
        (
            "project_scopes",
            vec!["id", "name", "root_path", "root_display_path", "profile_id"],
        ),
    ] {
        values.extend(debug_text_values_for_table(&conn, table.0, &table.1)?);
    }
    Ok(values.join("\n"))
}

#[cfg(test)]
fn debug_text_values_for_table(
    conn: &Connection,
    table_name: &str,
    columns: &[&str],
) -> Result<Vec<String>, ResourceStoreError> {
    let mut values = Vec::new();
    let select_list = columns.join(", ");
    let mut stmt = conn.prepare(&format!("SELECT {select_list} FROM {table_name}"))?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        for (index, _) in columns.iter().enumerate() {
            if let Ok(Some(value)) = row.get::<_, Option<String>>(index) {
                values.push(value);
            }
        }
    }
    Ok(values)
}

#[cfg(test)]
mod tests {
    use super::{
        clear_resource_library_for_path, debug_all_text_values_for_path,
        get_active_resource_corpus_summary_for_path, get_app_setting_for_path,
        get_library_summary_for_path, get_resource_counts_by_scope_for_path,
        get_resource_detail_for_path, initialize_database,
        list_enabled_stored_scan_sources_for_path, list_persisted_resources_for_path,
        list_project_scopes_for_path, list_resource_corpus_scopes_for_path,
        list_resources_by_kind_for_path, list_resources_by_scope_for_path, list_scan_jobs_for_path,
        list_scan_sources_for_path, persist_scan_job_for_path, remove_scan_source_for_path,
        set_app_setting_for_path, store_status_for_path, update_scan_source_for_path,
        upsert_scan_source_for_path, PersistScanErrorInput, PersistScanJobInput,
        PersistScanResourceInput, PersistScanSkipInput, PersistScanSourceInput,
        ResourceCorpusQuery, ResourceStoreError, UpdateScanSourceInput, UpsertScanSourceInput,
    };
    use std::fs;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static NEXT_TEST_DB: AtomicUsize = AtomicUsize::new(1);

    #[test]
    fn migrations_are_idempotent() {
        let db_path = temp_db_path("migrations");

        initialize_database(&db_path).expect("first migration should succeed");
        initialize_database(&db_path).expect("second migration should be safe");

        let status = store_status_for_path(&db_path).expect("status should load");
        assert!(status.database_ready);
        assert_eq!(status.schema_version, 3);
        assert_eq!(status.resource_count, 0);
        assert!(status.metadata_only);
        assert!(!status.content_storage_enabled);

        cleanup_db(db_path);
    }

    #[test]
    fn app_settings_round_trip_json_values() {
        let db_path = temp_db_path("app-settings");
        initialize_database(&db_path).expect("migration should succeed");

        let empty = get_app_setting_for_path(&db_path, "firstRunOnboardingDismissed")
            .expect("setting lookup should succeed");
        assert!(empty.is_none());

        let stored = set_app_setting_for_path(&db_path, "firstRunOnboardingDismissed", "true")
            .expect("setting should persist");
        assert_eq!(stored.key, "firstRunOnboardingDismissed");
        assert_eq!(stored.value_json, "true");

        let loaded = get_app_setting_for_path(&db_path, "firstRunOnboardingDismissed")
            .expect("setting should load")
            .expect("setting should exist");
        assert_eq!(loaded.value_json, "true");

        let updated = set_app_setting_for_path(&db_path, "firstRunOnboardingDismissed", "false")
            .expect("setting should update");
        assert_eq!(updated.value_json, "false");
        assert!(updated.updated_at_ms >= stored.updated_at_ms);

        cleanup_db(db_path);
    }

    #[test]
    fn app_settings_reject_invalid_json_values() {
        let db_path = temp_db_path("app-settings-invalid-json");
        initialize_database(&db_path).expect("migration should succeed");

        let error =
            set_app_setting_for_path(&db_path, "firstRunOnboardingDismissed", "not valid json")
                .expect_err("invalid JSON should be rejected");

        assert!(matches!(error, ResourceStoreError::InvalidInput(_)));
        cleanup_db(db_path);
    }

    #[test]
    fn upserts_scan_source_and_tracks_latest_job() {
        let db_path = temp_db_path("source-upsert");
        initialize_database(&db_path).expect("migration should succeed");

        persist_scan_job_for_path(&db_path, sample_completed_job("job-1", 1))
            .expect("first job should persist");
        persist_scan_job_for_path(&db_path, sample_completed_job("job-2", 2))
            .expect("second job should persist");

        let sources = list_scan_sources_for_path(&db_path).expect("sources should load");
        assert_eq!(sources.len(), 1);
        assert_eq!(sources[0].last_scan_job_id.as_deref(), Some("job-2"));
        assert_eq!(sources[0].root_display_path, "~/custom-scan-basic");
        assert_eq!(sources[0].project_label.as_deref(), Some("Fixture Project"));
        assert_eq!(sources[0].resource_count, 2);
        assert_eq!(sources[0].skipped_entries, 2);

        let summary = get_library_summary_for_path(&db_path).expect("summary should load");
        assert_eq!(summary.source_count, 1);
        assert_eq!(summary.enabled_source_count, 1);
        assert_eq!(summary.job_count, 2);
        assert_eq!(summary.resource_count, 2);
        assert_eq!(summary.skipped_entry_total, 2);
        assert_eq!(summary.error_total, 0);
        assert_eq!(
            summary.latest_job.as_ref().map(|job| job.id.as_str()),
            Some("job-2")
        );
        assert_eq!(
            summary
                .latest_successful_scan
                .as_ref()
                .map(|job| job.id.as_str()),
            Some("job-2")
        );

        cleanup_db(db_path);
    }

    #[test]
    fn persists_resources_with_redacted_locations_and_kind_counts() {
        let db_path = temp_db_path("resources");
        initialize_database(&db_path).expect("migration should succeed");

        persist_scan_job_for_path(&db_path, sample_completed_job("job-1", 1))
            .expect("job should persist");

        let resources =
            list_persisted_resources_for_path(&db_path, Some(10)).expect("resources should load");
        assert_eq!(resources.len(), 2);
        assert!(resources
            .iter()
            .any(|resource| resource.display_path == "configs/[sensitive]"
                && resource.sensitive_path_redacted));

        let summary = get_library_summary_for_path(&db_path).expect("summary should load");
        let skill_count = summary
            .counts_by_kind
            .iter()
            .find(|item| item.resource_kind == "skill")
            .map(|item| item.count);
        let unknown_count = summary
            .counts_by_kind
            .iter()
            .find(|item| item.resource_kind == "unknown-local-resource")
            .map(|item| item.count);
        assert_eq!(skill_count, Some(1));
        assert_eq!(unknown_count, Some(1));

        cleanup_db(db_path);
    }

    #[test]
    fn persists_cancelled_and_failed_jobs_without_completed_resources() {
        let db_path = temp_db_path("terminal-jobs");
        initialize_database(&db_path).expect("migration should succeed");

        persist_scan_job_for_path(&db_path, sample_cancelled_job("job-cancelled"))
            .expect("cancelled job should persist");
        persist_scan_job_for_path(&db_path, sample_failed_job("job-failed"))
            .expect("failed job should persist");

        let jobs = list_scan_jobs_for_path(&db_path, Some(10)).expect("jobs should load");
        assert_eq!(jobs.len(), 2);
        assert!(jobs
            .iter()
            .any(|job| job.status == "cancelled" && job.cancelled));
        assert!(jobs
            .iter()
            .any(|job| job.status == "failed" && job.error_count == 1));

        let summary = get_library_summary_for_path(&db_path).expect("summary should load");
        assert_eq!(summary.job_count, 2);
        assert_eq!(summary.resource_count, 0);

        cleanup_db(db_path);
    }

    #[test]
    fn clear_library_removes_local_records_without_dropping_schema() {
        let db_path = temp_db_path("clear");
        initialize_database(&db_path).expect("migration should succeed");
        persist_scan_job_for_path(&db_path, sample_completed_job("job-1", 1))
            .expect("job should persist");

        let cleared = clear_resource_library_for_path(&db_path).expect("clear should succeed");
        assert_eq!(cleared.source_count, 0);
        assert_eq!(cleared.job_count, 0);
        assert_eq!(cleared.resource_count, 0);

        let status = store_status_for_path(&db_path).expect("status should still load");
        assert!(status.database_ready);
        assert_eq!(status.schema_version, 3);

        cleanup_db(db_path);
    }

    #[test]
    fn stored_text_values_do_not_include_fixture_content_markers() {
        let db_path = temp_db_path("no-content");
        initialize_database(&db_path).expect("migration should succeed");
        persist_scan_job_for_path(&db_path, sample_completed_job("job-1", 1))
            .expect("job should persist");

        let stored_text = debug_all_text_values_for_path(&db_path).expect("debug text should load");
        for forbidden in [
            "Fixture skill metadata file",
            "Fixture prompt placeholder",
            "Fixture unknown local resource",
        ] {
            assert!(
                !stored_text.contains(forbidden),
                "resource store must not persist fixture content marker {forbidden}"
            );
        }

        cleanup_db(db_path);
    }

    #[test]
    fn adds_updates_and_removes_scan_sources_without_user_file_deletes() {
        let db_path = temp_db_path("source-management");
        initialize_database(&db_path).expect("migration should succeed");

        let source = upsert_scan_source_for_path(&db_path, sample_upsert_source(None, true))
            .expect("source should upsert");
        assert_eq!(source.profile_id, "project-root");
        assert_eq!(source.project_label.as_deref(), Some("Workspace A"));

        let updated = update_scan_source_for_path(
            &db_path,
            UpdateScanSourceInput {
                id: source.id.clone(),
                display_name: Some("Renamed Fixture".to_string()),
                profile_id: Some("skills-prompts-workspace".to_string()),
                project_label: Some("Workspace B".to_string()),
                enabled: Some(false),
            },
        )
        .expect("source should update");
        assert_eq!(updated.display_name, "Renamed Fixture");
        assert_eq!(updated.profile_id, "skills-prompts-workspace");
        assert!(!updated.enabled);
        assert_eq!(updated.project_label.as_deref(), Some("Workspace B"));

        let enabled = list_enabled_stored_scan_sources_for_path(&db_path, &[source.id.clone()])
            .expect("enabled source list should load");
        assert!(enabled.is_empty(), "disabled source must be excluded");

        let summary =
            remove_scan_source_for_path(&db_path, &source.id).expect("source should remove");
        assert_eq!(summary.source_count, 0);
        assert_eq!(summary.resource_count, 0);

        cleanup_db(db_path);
    }

    #[test]
    fn duplicate_source_additions_reuse_root_source_record() {
        let db_path = temp_db_path("duplicate-source");
        initialize_database(&db_path).expect("migration should succeed");

        let first = upsert_scan_source_for_path(&db_path, sample_upsert_source(None, true))
            .expect("first source should upsert");
        let second = upsert_scan_source_for_path(
            &db_path,
            UpsertScanSourceInput {
                profile_id: "docs-reports-workspace".to_string(),
                project_label: Some("Workspace B".to_string()),
                ..sample_upsert_source(None, true)
            },
        )
        .expect("duplicate source should update");

        assert_eq!(first.id, second.id);
        assert_eq!(second.profile_id, "docs-reports-workspace");
        assert_eq!(second.project_label.as_deref(), Some("Workspace B"));

        let sources = list_scan_sources_for_path(&db_path).expect("sources should load");
        assert_eq!(sources.len(), 1);

        cleanup_db(db_path);
    }

    #[test]
    fn source_removal_deletes_associated_jobs_and_locations_only_from_store() {
        let db_path = temp_db_path("source-delete-semantics");
        initialize_database(&db_path).expect("migration should succeed");
        persist_scan_job_for_path(&db_path, sample_completed_job("job-1", 1))
            .expect("job should persist");
        let source = list_scan_sources_for_path(&db_path)
            .expect("sources should load")
            .remove(0);

        let summary =
            remove_scan_source_for_path(&db_path, &source.id).expect("source should remove");
        assert_eq!(summary.source_count, 0);
        assert_eq!(summary.job_count, 0);
        assert_eq!(summary.resource_count, 0);
        assert_eq!(summary.location_count, 0);

        cleanup_db(db_path);
    }

    #[test]
    fn corpus_read_queries_return_empty_state_for_empty_store() {
        let db_path = temp_db_path("corpus-empty");
        initialize_database(&db_path).expect("migration should succeed");

        let summary = get_active_resource_corpus_summary_for_path(&db_path)
            .expect("corpus summary should load");
        assert_eq!(summary.resource_count, 0);
        assert_eq!(summary.project_scope_count, 0);
        assert!(summary.counts_by_kind.is_empty());
        assert!(summary.metadata_only);
        assert!(!summary.content_storage_enabled);

        let scopes =
            list_resource_corpus_scopes_for_path(&db_path).expect("corpus scopes should load");
        assert_eq!(scopes.len(), 1);
        assert_eq!(scopes[0].scope_kind, "global");
        assert_eq!(scopes[0].resource_count, 0);

        let resources = list_resources_by_scope_for_path(
            &db_path,
            ResourceCorpusQuery {
                scope_kind: Some("global".to_string()),
                scope_id: None,
                project_label: None,
                scan_source_id: None,
                resource_kind: None,
                limit: Some(10),
                offset: Some(0),
            },
        )
        .expect("empty resource list should load");
        assert!(resources.is_empty());

        let detail_error = get_resource_detail_for_path(&db_path, "missing-resource")
            .expect_err("missing detail should fail");
        assert!(matches!(detail_error, ResourceStoreError::InvalidInput(_)));

        cleanup_db(db_path);
    }

    #[test]
    fn corpus_queries_derive_project_source_scope_counts_and_details() {
        let db_path = temp_db_path("corpus-project");
        initialize_database(&db_path).expect("migration should succeed");
        persist_scan_job_for_path(&db_path, sample_completed_job("job-1", 1))
            .expect("job should persist");

        let summary = get_active_resource_corpus_summary_for_path(&db_path)
            .expect("corpus summary should load");
        assert_eq!(summary.resource_count, 2);
        assert_eq!(summary.project_scope_count, 1);
        assert_eq!(summary.source_count, 1);
        assert_eq!(summary.skipped_entry_total, 1);
        assert_eq!(summary.error_total, 0);

        let project_scopes =
            list_project_scopes_for_path(&db_path).expect("project scopes should load");
        assert_eq!(project_scopes.len(), 1);
        assert_eq!(project_scopes[0].label, "Fixture Project");
        assert_eq!(project_scopes[0].resource_count, 2);

        let sources = list_scan_sources_for_path(&db_path).expect("sources should load");
        let source_id = sources[0].id.clone();
        let all_scopes =
            list_resource_corpus_scopes_for_path(&db_path).expect("all scopes should load");
        assert!(all_scopes.iter().any(|scope| scope.scope_kind == "global"));
        assert!(all_scopes
            .iter()
            .any(|scope| scope.scope_kind == "project" && scope.label == "Fixture Project"));
        assert!(all_scopes.iter().any(|scope| scope.scope_kind == "source"
            && scope.scan_source_id.as_deref() == Some(source_id.as_str())));

        let global_resources = list_resources_by_scope_for_path(
            &db_path,
            ResourceCorpusQuery {
                scope_kind: Some("global".to_string()),
                scope_id: None,
                project_label: None,
                scan_source_id: None,
                resource_kind: None,
                limit: Some(50),
                offset: Some(0),
            },
        )
        .expect("global resources should load");
        assert_eq!(global_resources.len(), 2);
        assert_eq!(global_resources[0].resource_kind, "skill");
        assert_eq!(
            global_resources[0].project_label.as_deref(),
            Some("Fixture Project")
        );
        assert_eq!(
            global_resources[0].scan_source_id.as_deref(),
            Some(source_id.as_str())
        );
        assert!(!global_resources[0].boundary_labels.is_empty());

        let project_resources = list_resources_by_scope_for_path(
            &db_path,
            ResourceCorpusQuery {
                scope_kind: Some("project".to_string()),
                scope_id: Some(project_scopes[0].id.clone()),
                project_label: None,
                scan_source_id: None,
                resource_kind: None,
                limit: Some(50),
                offset: Some(0),
            },
        )
        .expect("project resources should load");
        assert_eq!(project_resources.len(), 2);

        let source_resources = list_resources_by_scope_for_path(
            &db_path,
            ResourceCorpusQuery {
                scope_kind: Some("source".to_string()),
                scope_id: None,
                project_label: None,
                scan_source_id: Some(source_id),
                resource_kind: None,
                limit: Some(50),
                offset: Some(0),
            },
        )
        .expect("source resources should load");
        assert_eq!(source_resources.len(), 2);

        let skill_resources = list_resources_by_kind_for_path(&db_path, "skill", Some(10), None)
            .expect("kind resources should load");
        assert_eq!(skill_resources.len(), 1);
        assert_eq!(skill_resources[0].name, "SKILL.md");

        let sensitive = global_resources
            .iter()
            .find(|resource| resource.sensitive_path_redacted)
            .expect("sensitive resource should exist");
        let detail = get_resource_detail_for_path(&db_path, &sensitive.id)
            .expect("resource detail should load");
        assert_eq!(detail.resource.id, sensitive.id);
        assert_eq!(detail.locations.len(), 1);
        assert_eq!(
            detail.locations[0].project_label.as_deref(),
            Some("Fixture Project")
        );
        assert!(detail
            .findings
            .iter()
            .any(|finding| finding.finding_kind == "sensitive-path-redacted"));
        assert!(detail.metadata_only);
        assert!(!detail.content_storage_enabled);

        let counts =
            get_resource_counts_by_scope_for_path(&db_path).expect("scope counts should load");
        assert!(counts.iter().any(|count| count.scope_kind == "project"
            && count.label == "Fixture Project"
            && count.count == 2));

        cleanup_db(db_path);
    }

    #[test]
    fn corpus_unclassified_scope_filters_sources_without_project_label() {
        let db_path = temp_db_path("corpus-unclassified");
        initialize_database(&db_path).expect("migration should succeed");
        let mut job = sample_completed_job("job-unclassified", 1);
        job.source.project_label = None;
        persist_scan_job_for_path(&db_path, job).expect("job should persist");

        let scopes = list_resource_corpus_scopes_for_path(&db_path).expect("scopes should load");
        assert!(scopes
            .iter()
            .any(|scope| scope.scope_kind == "unclassified" && scope.resource_count == 2));

        let resources = list_resources_by_scope_for_path(
            &db_path,
            ResourceCorpusQuery {
                scope_kind: Some("unclassified".to_string()),
                scope_id: None,
                project_label: None,
                scan_source_id: None,
                resource_kind: None,
                limit: Some(10),
                offset: None,
            },
        )
        .expect("unclassified resources should load");
        assert_eq!(resources.len(), 2);
        assert!(resources
            .iter()
            .all(|resource| resource.project_label.is_none()));

        cleanup_db(db_path);
    }

    fn sample_completed_job(job_id: &str, sequence: u64) -> PersistScanJobInput {
        PersistScanJobInput {
            id: job_id.to_string(),
            status: "completed".to_string(),
            profile_id: "custom-folder".to_string(),
            started_at_ms: 1_725_000_000_000 + sequence,
            finished_at_ms: Some(1_725_000_001_000 + sequence),
            elapsed_ms: 1_000,
            requested_by: "custom-directory-scan".to_string(),
            total_entries: 12,
            matched_resources: 2,
            skipped_entries: 1,
            error_count: 0,
            cancelled: false,
            summary_json: "{\"metadataOnly\":true,\"contentStored\":false}".to_string(),
            source: sample_source(),
            resources: vec![
                PersistScanResourceInput {
                    name: "SKILL.md".to_string(),
                    resource_kind: "skill".to_string(),
                    description: "路径或文件名匹配技能资源。".to_string(),
                    primary_type: "file".to_string(),
                    risk_level: "low".to_string(),
                    boundary_labels: vec!["read-only".to_string(), "no-content-read".to_string()],
                    relative_path: "skills/writer/SKILL.md".to_string(),
                    display_path: "skills/writer/SKILL.md".to_string(),
                    extension: Some("md".to_string()),
                    entry_type: "file".to_string(),
                    size_bytes: Some(58),
                    modified_at_ms: Some(1_725_000_000_000),
                    classification_reason: "路径或文件名匹配技能资源。".to_string(),
                    sensitive_path_redacted: false,
                    risk_labels: vec!["metadata-only".to_string()],
                },
                PersistScanResourceInput {
                    name: "[sensitive]".to_string(),
                    resource_kind: "unknown-local-resource".to_string(),
                    description: "未匹配已知 AIOS 资源类别，仅保留本地元数据。".to_string(),
                    primary_type: "file".to_string(),
                    risk_level: "medium".to_string(),
                    boundary_labels: vec!["read-only".to_string(), "redacted".to_string()],
                    relative_path: "configs/[sensitive]".to_string(),
                    display_path: "configs/[sensitive]".to_string(),
                    extension: Some("env".to_string()),
                    entry_type: "file".to_string(),
                    size_bytes: Some(32),
                    modified_at_ms: None,
                    classification_reason: "未匹配已知 AIOS 资源类别，仅保留本地元数据。"
                        .to_string(),
                    sensitive_path_redacted: true,
                    risk_labels: vec![
                        "metadata-only".to_string(),
                        "sensitive-path-redacted".to_string(),
                    ],
                },
            ],
            skips: vec![PersistScanSkipInput {
                reason: "skipped_by_exclude".to_string(),
                count: 1,
                sample_safe_path: None,
            }],
            errors: Vec::new(),
        }
    }

    fn sample_cancelled_job(job_id: &str) -> PersistScanJobInput {
        PersistScanJobInput {
            id: job_id.to_string(),
            status: "cancelled".to_string(),
            profile_id: "custom-folder".to_string(),
            started_at_ms: 1_725_000_010_000,
            finished_at_ms: Some(1_725_000_010_500),
            elapsed_ms: 500,
            requested_by: "custom-directory-scan".to_string(),
            total_entries: 3,
            matched_resources: 0,
            skipped_entries: 1,
            error_count: 0,
            cancelled: true,
            summary_json: "{\"cancelled\":true,\"metadataOnly\":true}".to_string(),
            source: sample_source(),
            resources: Vec::new(),
            skips: vec![PersistScanSkipInput {
                reason: "skipped_by_cancellation".to_string(),
                count: 1,
                sample_safe_path: None,
            }],
            errors: Vec::new(),
        }
    }

    fn sample_failed_job(job_id: &str) -> PersistScanJobInput {
        PersistScanJobInput {
            id: job_id.to_string(),
            status: "failed".to_string(),
            profile_id: "custom-folder".to_string(),
            started_at_ms: 1_725_000_020_000,
            finished_at_ms: Some(1_725_000_020_200),
            elapsed_ms: 200,
            requested_by: "custom-directory-scan".to_string(),
            total_entries: 0,
            matched_resources: 0,
            skipped_entries: 0,
            error_count: 1,
            cancelled: false,
            summary_json: "{\"failed\":true,\"metadataOnly\":true}".to_string(),
            source: sample_source(),
            resources: Vec::new(),
            skips: Vec::new(),
            errors: vec![PersistScanErrorInput {
                error_kind: "permission_error".to_string(),
                message: "安全错误摘要。".to_string(),
                sample_safe_path: None,
            }],
        }
    }

    fn sample_source() -> PersistScanSourceInput {
        PersistScanSourceInput {
            id: None,
            display_name: "custom-scan-basic".to_string(),
            root_path: "/Users/example/custom-scan-basic".to_string(),
            root_display_path: "~/custom-scan-basic".to_string(),
            profile_id: "custom-folder".to_string(),
            source_kind: "custom-directory".to_string(),
            project_label: Some("Fixture Project".to_string()),
        }
    }

    fn sample_upsert_source(id: Option<String>, enabled: bool) -> UpsertScanSourceInput {
        UpsertScanSourceInput {
            id,
            display_name: "custom-scan-basic".to_string(),
            root_path: "/Users/example/custom-scan-basic".to_string(),
            root_display_path: "~/custom-scan-basic".to_string(),
            profile_id: "project-root".to_string(),
            source_kind: "custom-directory".to_string(),
            project_label: Some("Workspace A".to_string()),
            enabled,
        }
    }

    fn temp_db_path(name: &str) -> PathBuf {
        let counter = NEXT_TEST_DB.fetch_add(1, Ordering::Relaxed);
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after epoch")
            .as_millis();
        std::env::temp_dir()
            .join("aios-resource-store-tests")
            .join(format!("{name}-{now}-{counter}"))
            .join("resource-store.sqlite3")
    }

    fn cleanup_db(db_path: PathBuf) {
        if let Some(parent) = db_path.parent() {
            let _ = fs::remove_dir_all(parent);
        }
    }
}
