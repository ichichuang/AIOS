use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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
    pub latest_scan: Option<PersistedScanJob>,
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
pub struct ProjectResourceDirectory {
    pub scan_source_id: String,
    pub display_name: String,
    pub root_display_path: String,
    pub profile_id: String,
    pub source_kind: String,
    pub enabled: bool,
    pub resource_count: u64,
    pub skipped_entries: u64,
    pub error_count: u64,
    pub last_scan_status: Option<String>,
    pub last_scan_finished_at_ms: Option<u64>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectResourceMapEntry {
    pub scope_id: String,
    pub project_label: String,
    pub directories: Vec<ProjectResourceDirectory>,
    pub resource_count: u64,
    pub counts_by_kind: Vec<ResourceKindCount>,
    pub last_scan_status: Option<String>,
    pub last_scan_finished_at_ms: Option<u64>,
    pub skipped_entries: u64,
    pub error_count: u64,
    pub metadata_only: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScanSourceResourceMapEntry {
    pub scope_id: String,
    pub scan_source_id: String,
    pub display_name: String,
    pub root_display_path: String,
    pub profile_id: String,
    pub source_kind: String,
    pub project_label: Option<String>,
    pub enabled: bool,
    pub resource_count: u64,
    pub counts_by_kind: Vec<ResourceKindCount>,
    pub last_scan_status: Option<String>,
    pub last_scan_finished_at_ms: Option<u64>,
    pub skipped_entries: u64,
    pub error_count: u64,
    pub metadata_only: bool,
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

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillLibrarySummary {
    pub generated_at_ms: u64,
    pub latest_scan_at_ms: Option<u64>,
    pub latest_successful_scan_at_ms: Option<u64>,
    pub counts: SkillLibraryCounts,
    pub metadata_only: bool,
    pub content_storage_enabled: bool,
}

#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillLibraryCounts {
    pub total_skill_candidates: u64,
    pub deduped_skill_count: u64,
    pub available_skill_count: u64,
    pub needs_attention_count: u64,
    pub duplicate_count: u64,
    pub broken_count: u64,
    pub source_unknown_count: u64,
    pub unchecked_count: u64,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillListItem {
    pub id: String,
    pub display_name: String,
    pub original_name: String,
    pub short_purpose: String,
    pub status: SkillStatus,
    pub source_label: String,
    pub source_kind_label: String,
    pub available_in_tools: Vec<String>,
    pub usage_text: Option<String>,
    pub attention_reasons: Vec<SkillAttentionReason>,
    pub primary_path_hint: String,
    pub source_count: u64,
    pub updated_at: Option<String>,
    pub last_seen_at: Option<String>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillDetail {
    #[serde(flatten)]
    pub item: SkillListItem,
    pub what_it_does: String,
    pub when_to_use: Option<String>,
    pub how_to_use: Option<String>,
    pub usage_summary: SkillUsageSummary,
    pub source_summaries: Vec<SkillSourceSummary>,
    pub related_duplicate_sources: Vec<SkillSourceSummary>,
    pub safe_advanced_metadata_summary: Vec<SkillAdvancedMetadataRow>,
    pub findings: Vec<SkillAttentionReason>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillSourceSummary {
    pub id: String,
    pub source_label: String,
    pub source_kind_label: String,
    pub available_in_tools: Vec<String>,
    pub path_hint: String,
    pub root_path_hint: Option<String>,
    pub last_seen_at: Option<String>,
    pub scan_status: Option<String>,
    pub finding_count: u64,
    pub duplicate: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillUsageSummary {
    pub usage_known: bool,
    pub usage_text: String,
    pub available_in_tools: Vec<String>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillAttentionReason {
    pub code: String,
    pub label: String,
    pub detail: String,
    pub severity: String,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillAdvancedMetadataRow {
    pub label: String,
    pub value: String,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SkillStatus {
    Available,
    NeedsAttention,
    Duplicate,
    Broken,
    SourceUnknown,
    Unchecked,
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
pub fn get_project_resource_map(
    state: State<'_, ResourceStoreState>,
) -> Result<Vec<ProjectResourceMapEntry>, ResourceStoreCommandError> {
    get_project_resource_map_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn get_scan_source_resource_map(
    state: State<'_, ResourceStoreState>,
) -> Result<Vec<ScanSourceResourceMapEntry>, ResourceStoreCommandError> {
    get_scan_source_resource_map_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
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
pub fn get_skill_library_summary(
    state: State<'_, ResourceStoreState>,
) -> Result<SkillLibrarySummary, ResourceStoreCommandError> {
    get_skill_library_summary_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn list_skill_library_items(
    state: State<'_, ResourceStoreState>,
) -> Result<Vec<SkillListItem>, ResourceStoreCommandError> {
    list_skill_library_items_for_path(&state.db_path).map_err(ResourceStoreCommandError::from)
}

#[tauri::command]
pub fn get_skill_detail(
    state: State<'_, ResourceStoreState>,
    skill_id: String,
) -> Result<SkillDetail, ResourceStoreCommandError> {
    get_skill_detail_for_path(&state.db_path, &skill_id).map_err(ResourceStoreCommandError::from)
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
    list_scan_sources_for_connection(&conn)
}

fn list_scan_sources_for_connection(
    conn: &Connection,
) -> Result<Vec<PersistedScanSource>, ResourceStoreError> {
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
        latest_scan: latest_scan_job(&conn)?,
        latest_successful_scan: latest_successful_scan_job(&conn)?,
        counts_by_kind: resource_kind_counts(&conn)?,
        counts_by_scope,
        skipped_entry_total: scalar_count(&conn, "SELECT COALESCE(SUM(count), 0) FROM scan_skips")?,
        error_total: scalar_count(&conn, "SELECT COUNT(*) FROM scan_errors")?,
        metadata_only: true,
        content_storage_enabled: false,
    })
}

pub fn get_project_resource_map_for_path(
    db_path: &Path,
) -> Result<Vec<ProjectResourceMapEntry>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    get_project_resource_map_for_connection(&conn)
}

pub fn get_scan_source_resource_map_for_path(
    db_path: &Path,
) -> Result<Vec<ScanSourceResourceMapEntry>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    get_scan_source_resource_map_for_connection(&conn)
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

pub fn get_skill_library_summary_for_path(
    db_path: &Path,
) -> Result<SkillLibrarySummary, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let groups = build_skill_library_groups(&conn)?;
    let latest_scan = latest_scan_job(&conn)?;
    let latest_successful_scan = latest_successful_scan_job(&conn)?;
    let counts = skill_library_counts(&groups);

    Ok(SkillLibrarySummary {
        generated_at_ms: current_time_ms(),
        latest_scan_at_ms: latest_scan
            .as_ref()
            .and_then(|job| job.finished_at_ms.or(Some(job.started_at_ms))),
        latest_successful_scan_at_ms: latest_successful_scan
            .as_ref()
            .and_then(|job| job.finished_at_ms.or(Some(job.started_at_ms))),
        counts,
        metadata_only: true,
        content_storage_enabled: false,
    })
}

pub fn list_skill_library_items_for_path(
    db_path: &Path,
) -> Result<Vec<SkillListItem>, ResourceStoreError> {
    let conn = open_initialized_connection(db_path)?;
    let groups = build_skill_library_groups(&conn)?;
    Ok(groups
        .iter()
        .map(skill_list_item_for_group)
        .collect::<Vec<_>>())
}

pub fn get_skill_detail_for_path(
    db_path: &Path,
    skill_id: &str,
) -> Result<SkillDetail, ResourceStoreError> {
    let skill_id = normalized_required_text("技能 ID", skill_id)?;
    let conn = open_initialized_connection(db_path)?;
    let groups = build_skill_library_groups(&conn)?;
    let group = groups
        .iter()
        .find(|group| group.id == skill_id)
        .ok_or_else(|| ResourceStoreError::InvalidInput("未找到技能详情。".to_string()))?;
    Ok(skill_detail_for_group(group))
}

#[derive(Clone, Debug)]
struct SkillCandidate {
    resource: ResourceCorpusResource,
    findings: Vec<ResourceCorpusFinding>,
    identity_key: String,
    original_name: String,
    source_label: String,
    source_kind_label: String,
    available_in_tools: Vec<String>,
    primary_path_hint: String,
    source_unknown: bool,
    unchecked: bool,
    broken: bool,
}

#[derive(Clone, Debug)]
struct SkillLibraryGroup {
    id: String,
    identity_key: String,
    candidates: Vec<SkillCandidate>,
}

const UNKNOWN_SKILL_USAGE_TEXT: &str = "暂时无法判断使用方法。请在高级信息里查看来源。";

fn build_skill_library_groups(
    conn: &Connection,
) -> Result<Vec<SkillLibraryGroup>, ResourceStoreError> {
    let candidates = list_skill_candidates_for_connection(conn)?;
    let mut groups: Vec<SkillLibraryGroup> = Vec::new();
    let mut indexes_by_identity = HashMap::<String, usize>::new();

    for candidate in candidates {
        let index = if let Some(index) = indexes_by_identity.get(&candidate.identity_key) {
            *index
        } else {
            let id = stable_id("skill", &[&candidate.identity_key]);
            let index = groups.len();
            groups.push(SkillLibraryGroup {
                id,
                identity_key: candidate.identity_key.clone(),
                candidates: Vec::new(),
            });
            indexes_by_identity.insert(candidate.identity_key.clone(), index);
            index
        };
        groups[index].candidates.push(candidate);
    }

    groups.sort_by(|left, right| {
        let left_item = skill_list_item_for_group(left);
        let right_item = skill_list_item_for_group(right);
        skill_status_rank(&left_item.status)
            .cmp(&skill_status_rank(&right_item.status))
            .then_with(|| left_item.display_name.cmp(&right_item.display_name))
            .then_with(|| left.id.cmp(&right.id))
    });
    Ok(groups)
}

fn list_skill_candidates_for_connection(
    conn: &Connection,
) -> Result<Vec<SkillCandidate>, ResourceStoreError> {
    let mut sql = corpus_resource_base_sql();
    sql.push_str(
        " WHERE r.resource_kind = 'skill'
        ORDER BY r.name ASC, COALESCE(l.relative_path, '') ASC",
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], row_to_corpus_resource)?;
    let resources = collect_rows(rows)?;
    let mut candidates = Vec::with_capacity(resources.len());

    for resource in resources {
        let findings = list_resource_findings_for_connection(conn, &resource.id)?;
        let original_name = skill_original_name(&resource);
        let identity_key = skill_identity_key(&resource, &original_name);
        let available_in_tools = infer_available_tools(&resource);
        let source_unknown = is_source_unknown(&resource);
        let source_label = skill_source_label(&resource, &available_in_tools, source_unknown);
        let source_kind_label = skill_source_kind_label(&resource, &source_label, source_unknown);
        let primary_path_hint = safe_skill_path_hint(&resource);
        let unchecked = skill_is_unchecked(&resource);
        let broken = skill_is_broken(&resource, &findings);

        candidates.push(SkillCandidate {
            resource,
            findings,
            identity_key,
            original_name,
            source_label,
            source_kind_label,
            available_in_tools,
            primary_path_hint,
            source_unknown,
            unchecked,
            broken,
        });
    }

    Ok(candidates)
}

fn skill_library_counts(groups: &[SkillLibraryGroup]) -> SkillLibraryCounts {
    let total_skill_candidates = groups
        .iter()
        .map(|group| group.candidates.len() as u64)
        .sum::<u64>();
    let deduped_skill_count = groups.len() as u64;
    let duplicate_count = total_skill_candidates.saturating_sub(deduped_skill_count);
    let mut counts = SkillLibraryCounts {
        total_skill_candidates,
        deduped_skill_count,
        duplicate_count,
        ..SkillLibraryCounts::default()
    };

    for group in groups {
        match skill_status_for_group(group) {
            SkillStatus::Available => counts.available_skill_count += 1,
            SkillStatus::Broken => {
                counts.needs_attention_count += 1;
                counts.broken_count += 1;
            }
            SkillStatus::SourceUnknown => {
                counts.needs_attention_count += 1;
                counts.source_unknown_count += 1;
            }
            SkillStatus::Unchecked => {
                counts.needs_attention_count += 1;
                counts.unchecked_count += 1;
            }
            SkillStatus::Duplicate | SkillStatus::NeedsAttention => {
                counts.needs_attention_count += 1;
            }
        }
    }

    counts
}

fn skill_list_item_for_group(group: &SkillLibraryGroup) -> SkillListItem {
    let primary = select_primary_skill_candidate(group);
    let available_in_tools = merged_available_tools(group);
    let status = skill_status_for_group(group);
    let usage_text = Some(skill_usage_text(
        &primary.original_name,
        &available_in_tools,
    ));
    let short_purpose = skill_short_purpose(primary);
    let attention_reasons = attention_reasons_for_group(group);

    SkillListItem {
        id: group.id.clone(),
        display_name: skill_display_name(&primary.original_name),
        original_name: primary.original_name.clone(),
        short_purpose,
        status,
        source_label: merged_source_label(group, primary),
        source_kind_label: merged_source_kind_label(group, primary),
        available_in_tools,
        usage_text,
        attention_reasons,
        primary_path_hint: safe_product_path_hint(&primary.primary_path_hint),
        source_count: group.candidates.len() as u64,
        updated_at: primary
            .resource
            .modified_at_ms
            .or(Some(primary.resource.updated_at_ms))
            .map(|value| value.to_string()),
        last_seen_at: primary
            .resource
            .scan_job_finished_at_ms
            .or(primary.resource.scan_job_started_at_ms)
            .map(|value| value.to_string()),
    }
}

fn skill_detail_for_group(group: &SkillLibraryGroup) -> SkillDetail {
    let item = skill_list_item_for_group(group);
    let usage_text = item
        .usage_text
        .clone()
        .unwrap_or_else(|| UNKNOWN_SKILL_USAGE_TEXT.to_string());
    let source_summaries = group
        .candidates
        .iter()
        .enumerate()
        .map(|(index, candidate)| skill_source_summary(candidate, index > 0))
        .collect::<Vec<_>>();
    let related_duplicate_sources = source_summaries
        .iter()
        .filter(|source| source.duplicate)
        .cloned()
        .collect::<Vec<_>>();
    let findings = group
        .candidates
        .iter()
        .flat_map(finding_attention_reasons)
        .collect::<Vec<_>>();

    SkillDetail {
        what_it_does: item.short_purpose.clone(),
        when_to_use: skill_when_to_use(&item.original_name, &item.short_purpose),
        how_to_use: Some(usage_text.clone()),
        usage_summary: SkillUsageSummary {
            usage_known: usage_text != UNKNOWN_SKILL_USAGE_TEXT,
            usage_text,
            available_in_tools: item.available_in_tools.clone(),
        },
        source_summaries,
        related_duplicate_sources,
        safe_advanced_metadata_summary: skill_advanced_metadata_rows(group, &item),
        findings,
        item,
    }
}

fn skill_source_summary(candidate: &SkillCandidate, duplicate: bool) -> SkillSourceSummary {
    SkillSourceSummary {
        id: candidate.resource.id.clone(),
        source_label: candidate.source_label.clone(),
        source_kind_label: candidate.source_kind_label.clone(),
        available_in_tools: candidate.available_in_tools.clone(),
        path_hint: safe_product_path_hint(&candidate.primary_path_hint),
        root_path_hint: candidate
            .resource
            .root_display_path
            .as_deref()
            .map(safe_product_path_hint),
        last_seen_at: candidate
            .resource
            .scan_job_finished_at_ms
            .or(candidate.resource.scan_job_started_at_ms)
            .map(|value| value.to_string()),
        scan_status: candidate.resource.scan_job_status.clone(),
        finding_count: candidate.findings.len() as u64,
        duplicate,
    }
}

fn skill_advanced_metadata_rows(
    group: &SkillLibraryGroup,
    item: &SkillListItem,
) -> Vec<SkillAdvancedMetadataRow> {
    vec![
        SkillAdvancedMetadataRow {
            label: "产品状态".to_string(),
            value: skill_status_label(&item.status).to_string(),
        },
        SkillAdvancedMetadataRow {
            label: "去重键".to_string(),
            value: group.identity_key.clone(),
        },
        SkillAdvancedMetadataRow {
            label: "去重来源数".to_string(),
            value: group.candidates.len().to_string(),
        },
        SkillAdvancedMetadataRow {
            label: "本地记录边界".to_string(),
            value: "仅使用 AIOS Desktop 已保存的基本信息，不读取技能正文。".to_string(),
        },
    ]
}

fn skill_status_for_group(group: &SkillLibraryGroup) -> SkillStatus {
    if group.candidates.iter().any(|candidate| candidate.broken) {
        return SkillStatus::Broken;
    }
    if group.candidates.len() > 1 {
        return SkillStatus::Duplicate;
    }
    let primary = select_primary_skill_candidate(group);
    if primary.source_unknown {
        return SkillStatus::SourceUnknown;
    }
    if primary.unchecked {
        return SkillStatus::Unchecked;
    }
    if !attention_reasons_for_group(group).is_empty() {
        return SkillStatus::NeedsAttention;
    }
    SkillStatus::Available
}

fn select_primary_skill_candidate(group: &SkillLibraryGroup) -> &SkillCandidate {
    group
        .candidates
        .iter()
        .min_by(|left, right| compare_skill_candidates(left, right))
        .expect("skill group must contain at least one candidate")
}

fn compare_skill_candidates(left: &SkillCandidate, right: &SkillCandidate) -> std::cmp::Ordering {
    candidate_rank(left)
        .cmp(&candidate_rank(right))
        .then_with(|| {
            right
                .resource
                .updated_at_ms
                .cmp(&left.resource.updated_at_ms)
        })
        .then_with(|| left.primary_path_hint.cmp(&right.primary_path_hint))
}

fn candidate_rank(candidate: &SkillCandidate) -> u8 {
    if candidate.broken {
        return 6;
    }
    if candidate.source_unknown {
        return 5;
    }
    if candidate
        .available_in_tools
        .iter()
        .any(|tool| tool != "Unknown")
    {
        return 0;
    }
    if candidate.source_label == "项目来源" {
        return 1;
    }
    2
}

fn attention_reasons_for_group(group: &SkillLibraryGroup) -> Vec<SkillAttentionReason> {
    let mut reasons = Vec::new();
    if group.candidates.len() > 1 {
        reasons.push(skill_attention_reason(
            "duplicate-sources",
            "发现重复来源",
            "找到了多个看起来相同的技能；默认只展示一个推荐项，其余在详情里查看。",
            "medium",
        ));
    }
    if group
        .candidates
        .iter()
        .any(|candidate| candidate.source_unknown)
    {
        reasons.push(skill_attention_reason(
            "source-unknown",
            "来源不明",
            "AIOS Desktop 还不能判断这个技能来自哪个清楚来源。",
            "medium",
        ));
    }
    if group.candidates.iter().any(|candidate| candidate.unchecked) {
        reasons.push(skill_attention_reason(
            "unchecked-source",
            "尚未确认",
            "最近一次记录没有完成状态，只能显示为待确认。",
            "low",
        ));
    }
    if group
        .candidates
        .iter()
        .any(|candidate| candidate.resource.sensitive_path_redacted)
    {
        reasons.push(skill_attention_reason(
            "sensitive-path-redacted",
            "路径已隐藏",
            "来源路径包含疑似敏感命名，AIOS Desktop 只显示隐藏后的路径提示。",
            "high",
        ));
    }
    if group
        .candidates
        .iter()
        .any(|candidate| candidate.resource.risk_level == "high")
    {
        reasons.push(skill_attention_reason(
            "high-risk-metadata",
            "需要人工查看",
            "本地记录把该技能标记为高风险元数据。",
            "high",
        ));
    }
    for candidate in &group.candidates {
        reasons.extend(finding_attention_reasons(candidate));
    }
    dedupe_attention_reasons(reasons)
}

fn finding_attention_reasons(candidate: &SkillCandidate) -> Vec<SkillAttentionReason> {
    candidate
        .findings
        .iter()
        .map(|finding| {
            skill_attention_reason(
                &finding.finding_kind,
                &finding_label(&finding.finding_kind),
                &safe_finding_detail(&finding.message),
                &finding.severity,
            )
        })
        .collect()
}

fn dedupe_attention_reasons(reasons: Vec<SkillAttentionReason>) -> Vec<SkillAttentionReason> {
    let mut seen = HashMap::<String, bool>::new();
    reasons
        .into_iter()
        .filter(|reason| {
            if seen.contains_key(&reason.code) {
                return false;
            }
            seen.insert(reason.code.clone(), true);
            true
        })
        .collect()
}

fn skill_attention_reason(
    code: &str,
    label: &str,
    detail: &str,
    severity: &str,
) -> SkillAttentionReason {
    SkillAttentionReason {
        code: code.to_string(),
        label: label.to_string(),
        detail: detail.to_string(),
        severity: severity.to_string(),
    }
}

fn finding_label(kind: &str) -> String {
    match kind {
        "sensitive-path-redacted" => "路径已隐藏".to_string(),
        "execution-disabled" => "不会执行".to_string(),
        "mcp-not-executed" => "不会启动 MCP".to_string(),
        _ => "需要查看".to_string(),
    }
}

fn skill_original_name(resource: &ResourceCorpusResource) -> String {
    for value in [
        resource.display_path.as_deref(),
        resource.relative_path.as_deref(),
    ] {
        if let Some(name) = skill_name_from_manifest_path(value) {
            return safe_skill_name(&name);
        }
    }
    let name = resource.name.trim();
    if !name.is_empty() && !is_generic_skill_file_name(name) {
        return safe_skill_name(name);
    }
    "未命名技能".to_string()
}

fn skill_identity_key(resource: &ResourceCorpusResource, original_name: &str) -> String {
    for value in [
        resource.relative_path.as_deref(),
        resource.display_path.as_deref(),
    ] {
        if skill_name_from_manifest_path(value).is_some() {
            return format!("skill-name:{}", normalize_skill_name(original_name));
        }
    }
    if !original_name.is_empty() && original_name != "未命名技能" {
        return format!("name:{}", normalize_skill_name(original_name));
    }
    format!(
        "stable-key:{}",
        safe_product_path_hint(&resource.stable_key).to_lowercase()
    )
}

fn skill_name_from_manifest_path(value: Option<&str>) -> Option<String> {
    let value = value?.trim();
    if value.is_empty() {
        return None;
    }
    let normalized = value.replace('\\', "/");
    if !normalized.to_lowercase().ends_with("/skill.md") && normalized.to_lowercase() != "skill.md"
    {
        return None;
    }
    let mut segments = normalized
        .split('/')
        .filter(|segment| !segment.trim().is_empty())
        .collect::<Vec<_>>();
    if segments.len() < 2 {
        return None;
    }
    segments.pop();
    segments
        .pop()
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
        .map(ToString::to_string)
}

fn is_generic_skill_file_name(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "skill.md" | "skills"
    )
}

fn normalize_skill_name(value: &str) -> String {
    value
        .trim()
        .replace('\\', "/")
        .trim_matches('/')
        .to_ascii_lowercase()
}

fn safe_skill_name(value: &str) -> String {
    if contains_secret_like_product_text(value) {
        "[sensitive]".to_string()
    } else {
        value.trim().to_string()
    }
}

fn skill_display_name(original_name: &str) -> String {
    if original_name == "未命名技能" {
        return original_name.to_string();
    }
    original_name.trim().to_string()
}

fn infer_available_tools(resource: &ResourceCorpusResource) -> Vec<String> {
    let text = [
        resource.relative_path.as_deref(),
        resource.display_path.as_deref(),
        resource.root_display_path.as_deref(),
        resource.scan_source_name.as_deref(),
        resource.source_kind.as_deref(),
        resource.project_label.as_deref(),
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join(" ")
    .replace('\\', "/")
    .to_ascii_lowercase();

    let mut tools = Vec::new();
    if text.contains(".codex/skills")
        || text.contains(".codex/plugins")
        || text.contains("/codex/")
        || text.contains("codex")
    {
        tools.push("Codex".to_string());
    }
    if text.contains(".claude/skills") || text.contains("/claude/") || text.contains("claude") {
        tools.push("Claude".to_string());
    }
    if text.contains(".agents/skills") || text.contains("/agents/") || text.contains("agents") {
        tools.push("Agents".to_string());
    }
    if tools.is_empty() {
        tools.push("Unknown".to_string());
    }
    unique_tool_labels(tools)
}

fn unique_tool_labels(values: Vec<String>) -> Vec<String> {
    let mut output = Vec::new();
    for value in values {
        if !output.contains(&value) {
            output.push(value);
        }
    }
    output
}

fn is_source_unknown(resource: &ResourceCorpusResource) -> bool {
    let source_kind = resource
        .source_kind
        .as_deref()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    let source_name = resource
        .scan_source_name
        .as_deref()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    let root = resource
        .root_display_path
        .as_deref()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    source_kind.is_empty()
        || source_kind == "unknown"
        || source_kind == "source-unknown"
        || (resource.project_label.is_none()
            && (source_name.is_empty()
                || source_name == "unknown"
                || root.is_empty()
                || root == "未记录"))
}

fn skill_source_label(
    resource: &ResourceCorpusResource,
    available_in_tools: &[String],
    source_unknown: bool,
) -> String {
    if source_unknown {
        return "来源不明".to_string();
    }
    if available_in_tools.len() == 1 && available_in_tools[0] != "Unknown" {
        return available_in_tools[0].clone();
    }
    let path_text = [
        resource.relative_path.as_deref(),
        resource.display_path.as_deref(),
        resource.root_display_path.as_deref(),
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join(" ")
    .replace('\\', "/")
    .to_ascii_lowercase();
    if path_text.contains(".codex/plugins") {
        return "插件".to_string();
    }
    if path_text.contains(".ai/skill-modules") {
        return "本地共享".to_string();
    }
    if resource.project_label.is_some() {
        return "项目来源".to_string();
    }
    match resource.source_kind.as_deref().unwrap_or_default() {
        "custom-directory" => "手动添加".to_string(),
        "intelligent-discovery" => "全局来源".to_string(),
        "advanced-full-disk" => "全局来源".to_string(),
        _ => resource
            .scan_source_name
            .clone()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "来源不明".to_string()),
    }
}

fn skill_source_kind_label(
    resource: &ResourceCorpusResource,
    source_label: &str,
    source_unknown: bool,
) -> String {
    if source_unknown {
        return "来源不明".to_string();
    }
    if matches!(
        source_label,
        "Codex" | "Claude" | "Agents" | "插件" | "本地共享" | "项目来源"
    ) {
        return source_label.to_string();
    }
    match resource.source_kind.as_deref().unwrap_or_default() {
        "custom-directory" => "手动添加".to_string(),
        "intelligent-discovery" => "全局来源".to_string(),
        "advanced-full-disk" => "全局来源".to_string(),
        _ => "来源不明".to_string(),
    }
}

fn safe_skill_path_hint(resource: &ResourceCorpusResource) -> String {
    let path = resource
        .display_path
        .as_deref()
        .or(resource.relative_path.as_deref())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(resource.name.as_str());
    let root = resource
        .root_display_path
        .as_deref()
        .filter(|value| !value.trim().is_empty() && *value != "未记录");
    if let Some(root) = root {
        if path.starts_with("~/") || path.starts_with('/') {
            return path.to_string();
        }
        return format!(
            "{}/{}",
            root.trim_end_matches('/'),
            path.trim_start_matches('/')
        );
    }
    path.to_string()
}

fn safe_product_path_hint(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return "未记录".to_string();
    }

    trimmed
        .replace('\\', "/")
        .split('/')
        .map(|segment| {
            if is_secret_like_product_segment(segment) {
                "[sensitive]"
            } else {
                segment
            }
        })
        .collect::<Vec<_>>()
        .join("/")
}

fn safe_finding_detail(value: &str) -> String {
    if contains_secret_like_product_text(value) || contains_raw_log_hint(value) {
        "已隐藏敏感内容。".to_string()
    } else {
        value.to_string()
    }
}

fn contains_raw_log_hint(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    lower.contains("raw log")
        || lower.contains("stdout")
        || lower.contains("stderr")
        || lower.contains("stack trace")
}

fn contains_secret_like_product_text(value: &str) -> bool {
    value
        .replace('\\', "/")
        .split('/')
        .any(is_secret_like_product_segment)
        || value
            .split(|character: char| {
                character.is_whitespace()
                    || matches!(
                        character,
                        '"' | '\'' | '=' | ':' | ';' | ',' | '{' | '}' | '[' | ']' | '(' | ')'
                    )
            })
            .any(is_secret_like_product_segment)
}

fn is_secret_like_product_segment(segment: &str) -> bool {
    let lower = segment.trim().to_ascii_lowercase();
    if lower.is_empty() || lower == "[sensitive]" {
        return false;
    }
    lower == ".env"
        || lower.ends_with(".env")
        || lower.contains("secret")
        || lower.contains("token")
        || lower.contains("credential")
        || lower.contains("password")
        || lower.contains("passwd")
        || lower.contains("private_key")
        || lower.contains("api_key")
        || lower.contains("apikey")
        || lower.contains("auth")
        || lower.contains("session")
        || lower.contains("cookie")
}

fn skill_is_unchecked(resource: &ResourceCorpusResource) -> bool {
    resource
        .scan_job_status
        .as_deref()
        .is_some_and(|status| status != "completed")
        || resource.scan_job_status.is_none()
}

fn skill_is_broken(resource: &ResourceCorpusResource, findings: &[ResourceCorpusFinding]) -> bool {
    resource.sensitive_path_redacted
        || resource.risk_level == "high"
        || findings.iter().any(|finding| finding.severity == "high")
}

fn merged_available_tools(group: &SkillLibraryGroup) -> Vec<String> {
    let mut tools = group
        .candidates
        .iter()
        .flat_map(|candidate| candidate.available_in_tools.clone())
        .filter(|tool| tool != "Unknown")
        .collect::<Vec<_>>();
    tools = unique_tool_labels(tools);
    if tools.is_empty() {
        vec!["Unknown".to_string()]
    } else {
        tools
    }
}

fn merged_source_label(group: &SkillLibraryGroup, primary: &SkillCandidate) -> String {
    let labels = group
        .candidates
        .iter()
        .map(|candidate| candidate.source_label.clone())
        .filter(|label| label != "来源不明")
        .collect::<Vec<_>>();
    let labels = unique_tool_labels(labels);
    if labels.len() > 1 {
        "多来源".to_string()
    } else {
        labels
            .first()
            .cloned()
            .unwrap_or_else(|| primary.source_label.clone())
    }
}

fn merged_source_kind_label(group: &SkillLibraryGroup, primary: &SkillCandidate) -> String {
    let labels = group
        .candidates
        .iter()
        .map(|candidate| candidate.source_kind_label.clone())
        .filter(|label| label != "来源不明")
        .collect::<Vec<_>>();
    let labels = unique_tool_labels(labels);
    if labels.len() > 1 {
        "多来源".to_string()
    } else {
        labels
            .first()
            .cloned()
            .unwrap_or_else(|| primary.source_kind_label.clone())
    }
}

fn skill_usage_text(original_name: &str, available_in_tools: &[String]) -> String {
    let invocation = skill_invocation_name(original_name);
    if available_in_tools.iter().any(|tool| tool == "Codex") {
        return format!("在 Codex 中输入 `${invocation}`。");
    }
    if available_in_tools.iter().any(|tool| tool == "Claude") {
        return format!("在 Claude 中使用 `{invocation}`。");
    }
    if available_in_tools.iter().any(|tool| tool == "Agents") {
        return format!("在 Agents 中使用 `{invocation}`。");
    }
    UNKNOWN_SKILL_USAGE_TEXT.to_string()
}

fn skill_invocation_name(original_name: &str) -> String {
    let trimmed = original_name.trim();
    if trimmed.starts_with('$') {
        trimmed.to_string()
    } else {
        format!("${trimmed}")
    }
}

fn skill_short_purpose(candidate: &SkillCandidate) -> String {
    let description = candidate.resource.description.trim();
    if is_meaningful_skill_description(description) {
        return description.to_string();
    }
    infer_skill_purpose_from_name(&candidate.original_name)
        .unwrap_or_else(|| "暂时无法判断用途。请在高级信息里查看来源。".to_string())
}

fn is_meaningful_skill_description(value: &str) -> bool {
    if value.trim().is_empty() {
        return false;
    }
    let normalized = value.to_ascii_lowercase();
    ![
        "路径或文件名匹配技能资源",
        "filesystem-discovered skill metadata",
        "canonical skill metadata",
        "registry skill metadata",
        "metadata",
    ]
    .iter()
    .any(|pattern| normalized.contains(pattern))
}

fn infer_skill_purpose_from_name(name: &str) -> Option<String> {
    let normalized = name.to_ascii_lowercase();
    if normalized.contains("writer")
        || normalized.contains("writing")
        || normalized.contains("copy")
        || normalized.contains("draft")
    {
        return Some("用于撰写、改写或整理文本。".to_string());
    }
    if normalized.contains("frontend")
        || normalized.contains("ui")
        || normalized.contains("react")
        || normalized.contains("vue")
    {
        return Some("用于前端界面、组件或样式相关任务。".to_string());
    }
    if normalized.contains("docs") || normalized.contains("doc") || normalized.contains("markdown")
    {
        return Some("用于文档、说明或知识整理相关任务。".to_string());
    }
    if normalized.contains("security") || normalized.contains("audit") {
        return Some("用于安全检查或风险排查相关任务。".to_string());
    }
    None
}

fn skill_when_to_use(original_name: &str, short_purpose: &str) -> Option<String> {
    if short_purpose.starts_with("暂时无法判断用途") {
        return None;
    }
    Some(format!(
        "当任务需要{}时使用 `{}`。",
        short_purpose.trim_end_matches('。'),
        skill_invocation_name(original_name)
    ))
}

fn skill_status_rank(status: &SkillStatus) -> u8 {
    match status {
        SkillStatus::Available => 0,
        SkillStatus::Duplicate => 1,
        SkillStatus::NeedsAttention => 2,
        SkillStatus::SourceUnknown => 3,
        SkillStatus::Broken => 4,
        SkillStatus::Unchecked => 5,
    }
}

fn skill_status_label(status: &SkillStatus) -> &'static str {
    match status {
        SkillStatus::Available => "可用",
        SkillStatus::NeedsAttention => "需要处理",
        SkillStatus::Duplicate => "重复",
        SkillStatus::Broken => "已损坏",
        SkillStatus::SourceUnknown => "来源不明",
        SkillStatus::Unchecked => "未检查",
    }
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

fn get_project_resource_map_for_connection(
    conn: &Connection,
) -> Result<Vec<ProjectResourceMapEntry>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT TRIM(project_label)
        FROM scan_sources
        WHERE project_label IS NOT NULL AND TRIM(project_label) <> ''
        ORDER BY TRIM(project_label) ASC",
    )?;
    let labels = collect_rows(stmt.query_map([], |row| row.get::<_, String>(0))?)?;
    let mut entries = Vec::with_capacity(labels.len());

    for project_label in labels {
        let directories = list_project_resource_directories(conn, &project_label)?;
        let latest_scan = latest_scan_for_project(conn, &project_label)?;
        entries.push(ProjectResourceMapEntry {
            scope_id: project_label_scope_id(&project_label),
            project_label: project_label.clone(),
            directories,
            resource_count: distinct_resource_count_for_project(conn, &project_label)?,
            counts_by_kind: resource_kind_counts_for_project(conn, &project_label)?,
            last_scan_status: latest_scan.as_ref().map(|scan| scan.0.clone()),
            last_scan_finished_at_ms: latest_scan.and_then(|scan| scan.1),
            skipped_entries: skipped_entries_for_project(conn, &project_label)?,
            error_count: error_count_for_project(conn, &project_label)?,
            metadata_only: true,
        });
    }

    Ok(entries)
}

fn list_project_resource_directories(
    conn: &Connection,
    project_label: &str,
) -> Result<Vec<ProjectResourceDirectory>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT
            s.id, s.display_name, s.root_display_path, s.profile_id, s.source_kind, s.enabled,
            (SELECT COUNT(DISTINCT l.resource_id) FROM resource_locations l WHERE l.scan_source_id = s.id),
            COALESCE((SELECT SUM(count) FROM scan_skips sk WHERE sk.scan_source_id = s.id), 0),
            COALESCE((SELECT COUNT(*) FROM scan_errors se WHERE se.scan_source_id = s.id), 0),
            j.status, j.finished_at
        FROM scan_sources s
        LEFT JOIN scan_jobs j ON j.id = s.last_scan_job_id
        WHERE COALESCE(TRIM(s.project_label), '') = ?1
        ORDER BY s.display_name ASC",
    )?;
    let rows = stmt.query_map(params![project_label], |row| {
        Ok(ProjectResourceDirectory {
            scan_source_id: row.get(0)?,
            display_name: row.get(1)?,
            root_display_path: row.get(2)?,
            profile_id: row.get(3)?,
            source_kind: row.get(4)?,
            enabled: int_to_bool(row.get(5)?),
            resource_count: i64_to_u64(row.get(6)?),
            skipped_entries: i64_to_u64(row.get(7)?),
            error_count: i64_to_u64(row.get(8)?),
            last_scan_status: row.get(9)?,
            last_scan_finished_at_ms: row.get::<_, Option<i64>>(10)?.map(i64_to_u64),
        })
    })?;
    collect_rows(rows)
}

fn get_scan_source_resource_map_for_connection(
    conn: &Connection,
) -> Result<Vec<ScanSourceResourceMapEntry>, ResourceStoreError> {
    let sources = list_scan_sources_for_connection(conn)?;
    let mut entries = Vec::with_capacity(sources.len());

    for source in sources {
        entries.push(ScanSourceResourceMapEntry {
            scope_id: source_scope_id(&source.id),
            scan_source_id: source.id.clone(),
            display_name: source.display_name,
            root_display_path: source.root_display_path,
            profile_id: source.profile_id,
            source_kind: source.source_kind,
            project_label: source.project_label,
            enabled: source.enabled,
            resource_count: source.resource_count,
            counts_by_kind: resource_kind_counts_for_source(conn, &source.id)?,
            last_scan_status: source.last_scan_status,
            last_scan_finished_at_ms: source.last_scan_finished_at_ms,
            skipped_entries: source.skipped_entries,
            error_count: source.error_count,
            metadata_only: true,
        });
    }

    Ok(entries)
}

fn resource_kind_counts_for_project(
    conn: &Connection,
    project_label: &str,
) -> Result<Vec<ResourceKindCount>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT r.resource_kind, COUNT(DISTINCT r.id)
        FROM resources r
        JOIN resource_locations l ON l.resource_id = r.id
        JOIN scan_sources s ON s.id = l.scan_source_id
        WHERE COALESCE(TRIM(s.project_label), '') = ?1
        GROUP BY r.resource_kind
        ORDER BY COUNT(DISTINCT r.id) DESC, r.resource_kind ASC",
    )?;
    let rows = stmt.query_map(params![project_label], |row| {
        Ok(ResourceKindCount {
            resource_kind: row.get(0)?,
            count: i64_to_u64(row.get(1)?),
        })
    })?;
    collect_rows(rows)
}

fn resource_kind_counts_for_source(
    conn: &Connection,
    source_id: &str,
) -> Result<Vec<ResourceKindCount>, ResourceStoreError> {
    let mut stmt = conn.prepare(
        "SELECT r.resource_kind, COUNT(DISTINCT r.id)
        FROM resources r
        JOIN resource_locations l ON l.resource_id = r.id
        WHERE l.scan_source_id = ?1
        GROUP BY r.resource_kind
        ORDER BY COUNT(DISTINCT r.id) DESC, r.resource_kind ASC",
    )?;
    let rows = stmt.query_map(params![source_id], |row| {
        Ok(ResourceKindCount {
            resource_kind: row.get(0)?,
            count: i64_to_u64(row.get(1)?),
        })
    })?;
    collect_rows(rows)
}

fn distinct_resource_count_for_project(
    conn: &Connection,
    project_label: &str,
) -> Result<u64, ResourceStoreError> {
    conn.query_row(
        "SELECT COUNT(DISTINCT l.resource_id)
        FROM resource_locations l
        JOIN scan_sources s ON s.id = l.scan_source_id
        WHERE COALESCE(TRIM(s.project_label), '') = ?1",
        params![project_label],
        |row| row.get::<_, i64>(0),
    )
    .map(i64_to_u64)
    .map_err(ResourceStoreError::from)
}

fn skipped_entries_for_project(
    conn: &Connection,
    project_label: &str,
) -> Result<u64, ResourceStoreError> {
    conn.query_row(
        "SELECT COALESCE(SUM(sk.count), 0)
        FROM scan_skips sk
        JOIN scan_sources s ON s.id = sk.scan_source_id
        WHERE COALESCE(TRIM(s.project_label), '') = ?1",
        params![project_label],
        |row| row.get::<_, i64>(0),
    )
    .map(i64_to_u64)
    .map_err(ResourceStoreError::from)
}

fn error_count_for_project(
    conn: &Connection,
    project_label: &str,
) -> Result<u64, ResourceStoreError> {
    conn.query_row(
        "SELECT COUNT(*)
        FROM scan_errors se
        JOIN scan_sources s ON s.id = se.scan_source_id
        WHERE COALESCE(TRIM(s.project_label), '') = ?1",
        params![project_label],
        |row| row.get::<_, i64>(0),
    )
    .map(i64_to_u64)
    .map_err(ResourceStoreError::from)
}

fn latest_scan_for_project(
    conn: &Connection,
    project_label: &str,
) -> Result<Option<(String, Option<u64>)>, ResourceStoreError> {
    conn.query_row(
        "SELECT j.status, j.finished_at
        FROM scan_sources s
        JOIN scan_jobs j ON j.id = s.last_scan_job_id
        WHERE COALESCE(TRIM(s.project_label), '') = ?1
        ORDER BY COALESCE(j.finished_at, j.started_at) DESC
        LIMIT 1",
        params![project_label],
        |row| {
            let status: String = row.get(0)?;
            let finished_at = row.get::<_, Option<i64>>(1)?.map(i64_to_u64);
            Ok((status, finished_at))
        },
    )
    .optional()
    .map_err(ResourceStoreError::from)
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
        get_library_summary_for_path, get_project_resource_map_for_path,
        get_resource_counts_by_scope_for_path, get_resource_detail_for_path,
        get_scan_source_resource_map_for_path, get_skill_detail_for_path,
        get_skill_library_summary_for_path, initialize_database,
        list_enabled_stored_scan_sources_for_path, list_persisted_resources_for_path,
        list_project_scopes_for_path, list_resource_corpus_scopes_for_path,
        list_resources_by_kind_for_path, list_resources_by_scope_for_path, list_scan_jobs_for_path,
        list_scan_sources_for_path, list_skill_library_items_for_path, persist_scan_job_for_path,
        remove_scan_source_for_path, set_app_setting_for_path, store_status_for_path,
        update_scan_source_for_path, upsert_scan_source_for_path, PersistScanErrorInput,
        PersistScanJobInput, PersistScanResourceInput, PersistScanSkipInput,
        PersistScanSourceInput, ResourceCorpusQuery, ResourceStoreError, SkillStatus,
        UpdateScanSourceInput, UpsertScanSourceInput,
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

        let project_map =
            get_project_resource_map_for_path(&db_path).expect("project map should load");
        let source_map =
            get_scan_source_resource_map_for_path(&db_path).expect("source map should load");
        assert!(project_map.is_empty());
        assert!(source_map.is_empty());

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

        let project_map =
            get_project_resource_map_for_path(&db_path).expect("project map should load");
        assert_eq!(project_map.len(), 1);
        assert_eq!(project_map[0].project_label, "Fixture Project");
        assert_eq!(project_map[0].resource_count, 2);
        assert_eq!(project_map[0].directories.len(), 1);
        assert_eq!(
            project_map[0].directories[0].root_display_path,
            "~/custom-scan-basic"
        );
        assert_eq!(
            project_map[0].directories[0].last_scan_status.as_deref(),
            Some("completed")
        );
        assert_eq!(project_map[0].counts_by_kind[0].resource_kind, "skill");
        assert_eq!(project_map[0].skipped_entries, 1);
        assert_eq!(project_map[0].error_count, 0);
        assert!(project_map[0].metadata_only);

        let source_map =
            get_scan_source_resource_map_for_path(&db_path).expect("source map should load");
        assert_eq!(source_map.len(), 1);
        assert_eq!(source_map[0].scan_source_id, source_id);
        assert_eq!(source_map[0].display_name, "custom-scan-basic");
        assert_eq!(source_map[0].root_display_path, "~/custom-scan-basic");
        assert_eq!(
            source_map[0].project_label.as_deref(),
            Some("Fixture Project")
        );
        assert_eq!(source_map[0].profile_id, "custom-folder");
        assert!(source_map[0].enabled);
        assert_eq!(source_map[0].resource_count, 2);
        assert_eq!(source_map[0].counts_by_kind[0].resource_kind, "skill");
        assert_eq!(source_map[0].last_scan_status.as_deref(), Some("completed"));
        assert_eq!(source_map[0].skipped_entries, 1);
        assert_eq!(source_map[0].error_count, 0);
        assert!(source_map[0].metadata_only);

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

    #[test]
    fn skill_library_summary_dedupes_skills_and_keeps_attention_counts_separate() {
        let db_path = temp_db_path("skill-library-summary");
        initialize_database(&db_path).expect("migration should succeed");
        persist_skill_library_fixture(&db_path);

        let summary =
            get_skill_library_summary_for_path(&db_path).expect("skill summary should load");
        assert_eq!(summary.counts.total_skill_candidates, 5);
        assert_eq!(summary.counts.deduped_skill_count, 4);
        assert_eq!(summary.counts.available_skill_count, 1);
        assert_eq!(summary.counts.needs_attention_count, 3);
        assert_eq!(summary.counts.duplicate_count, 1);
        assert_eq!(summary.counts.broken_count, 1);
        assert_eq!(summary.counts.source_unknown_count, 1);
        assert_eq!(summary.latest_scan_at_ms, Some(1_725_100_003_000));
        assert_eq!(
            summary.latest_successful_scan_at_ms,
            Some(1_725_100_003_000)
        );
        assert!(summary.metadata_only);
        assert!(!summary.content_storage_enabled);

        let serialized =
            serde_json::to_string(&summary).expect("summary should serialize to product JSON");
        assert!(!serialized.contains("super-secret-token"));
        assert!(!serialized.contains("/Users/example/secret"));

        cleanup_db(db_path);
    }

    #[test]
    fn skill_library_items_expose_product_fields_without_promoting_unknowns() {
        let db_path = temp_db_path("skill-library-items");
        initialize_database(&db_path).expect("migration should succeed");
        persist_skill_library_fixture(&db_path);

        let items = list_skill_library_items_for_path(&db_path).expect("items should load");
        assert_eq!(items.len(), 4);

        let writer = items
            .iter()
            .find(|item| item.original_name == "writer")
            .expect("writer item should exist");
        assert_eq!(writer.display_name, "writer");
        assert_eq!(writer.status, SkillStatus::Duplicate);
        assert_eq!(writer.source_label, "Codex");
        assert_eq!(writer.source_kind_label, "Codex");
        assert_eq!(writer.available_in_tools, vec!["Codex".to_string()]);
        assert_eq!(writer.source_count, 2);
        assert!(writer
            .usage_text
            .as_deref()
            .is_some_and(|text| text.contains("$writer")));
        assert!(writer
            .attention_reasons
            .iter()
            .any(|reason| reason.code == "duplicate-sources"));
        assert!(!writer.primary_path_hint.starts_with("/Users/example"));

        let local = items
            .iter()
            .find(|item| item.original_name == "local-helper")
            .expect("local helper should exist");
        assert_eq!(local.status, SkillStatus::Available);
        assert_eq!(local.source_label, "项目来源");
        assert_eq!(local.available_in_tools, vec!["Unknown".to_string()]);
        assert_eq!(
            local.usage_text.as_deref(),
            Some("暂时无法判断使用方法。请在高级信息里查看来源。")
        );

        let unknown = items
            .iter()
            .find(|item| item.original_name == "mystery")
            .expect("source unknown skill should exist");
        assert_eq!(unknown.status, SkillStatus::SourceUnknown);
        assert_eq!(unknown.source_label, "来源不明");
        assert_eq!(unknown.available_in_tools, vec!["Unknown".to_string()]);

        let broken = items
            .iter()
            .find(|item| item.original_name == "[sensitive]")
            .expect("broken skill should exist");
        assert_eq!(broken.status, SkillStatus::Broken);
        assert!(broken
            .attention_reasons
            .iter()
            .any(|reason| reason.code == "sensitive-path-redacted"));

        cleanup_db(db_path);
    }

    #[test]
    fn skill_detail_includes_sources_duplicates_findings_and_safe_advanced_metadata() {
        let db_path = temp_db_path("skill-library-detail");
        initialize_database(&db_path).expect("migration should succeed");
        persist_skill_library_fixture(&db_path);
        let writer = list_skill_library_items_for_path(&db_path)
            .expect("items should load")
            .into_iter()
            .find(|item| item.original_name == "writer")
            .expect("writer item should exist");

        let detail = get_skill_detail_for_path(&db_path, &writer.id).expect("detail should load");
        assert_eq!(detail.item.id, writer.id);
        assert_eq!(detail.what_it_does, writer.short_purpose);
        assert!(detail.when_to_use.is_some());
        assert_eq!(detail.how_to_use.as_deref(), writer.usage_text.as_deref());
        assert_eq!(detail.source_summaries.len(), 2);
        assert_eq!(detail.related_duplicate_sources.len(), 1);
        assert!(detail
            .safe_advanced_metadata_summary
            .iter()
            .any(|row| row.label == "去重来源数" && row.value == "2"));
        assert!(detail
            .findings
            .iter()
            .all(|finding| !finding.detail.contains("secret")));

        let serialized =
            serde_json::to_string(&detail).expect("detail should serialize to product JSON");
        assert!(!serialized.contains("super-secret-token"));
        assert!(!serialized.contains("/Users/example/secret"));

        cleanup_db(db_path);
    }

    #[test]
    fn skill_detail_redacts_secret_like_finding_text_and_root_hints() {
        let db_path = temp_db_path("skill-library-detail-safe-output");
        initialize_database(&db_path).expect("migration should succeed");
        persist_skill_library_fixture(&db_path);
        let broken = list_skill_library_items_for_path(&db_path)
            .expect("items should load")
            .into_iter()
            .find(|item| item.original_name == "[sensitive]")
            .expect("sensitive item should exist");

        let conn = rusqlite::Connection::open(&db_path).expect("db should open");
        conn.execute(
            "UPDATE scan_sources
            SET root_display_path = '/Users/example/secret-token-root'
            WHERE id = 'source-codex-skills'",
            [],
        )
        .expect("source root should update");
        conn.execute(
            "UPDATE resource_findings
            SET message = 'token=super-secret-token at /Users/example/secret-token-root/.env',
                safe_detail_json = '{\"token\":\"super-secret-token\",\"path\":\"/Users/example/secret-token-root/.env\"}'
            WHERE finding_kind = 'sensitive-path-redacted'",
            [],
        )
        .expect("finding should update");
        drop(conn);

        let detail =
            get_skill_detail_for_path(&db_path, &broken.id).expect("detail should still load");
        let serialized =
            serde_json::to_string(&detail).expect("detail should serialize to product JSON");

        assert!(detail.source_summaries.iter().all(|source| !source
            .path_hint
            .contains("secret-token-root")
            && !source
                .root_path_hint
                .as_deref()
                .unwrap_or_default()
                .contains("secret-token-root")));
        assert!(detail
            .findings
            .iter()
            .all(|finding| finding.detail == "已隐藏敏感内容。"));
        assert!(!serialized.contains("super-secret-token"));
        assert!(!serialized.contains("token="));
        assert!(!serialized.contains("/Users/example/secret-token-root"));
        assert!(serialized.contains("[sensitive]"));

        cleanup_db(db_path);
    }

    #[test]
    fn skill_library_fixture_scale_counts_extra_duplicate_sources_not_duplicate_groups() {
        let db_path = temp_db_path("skill-library-scale-counts");
        initialize_database(&db_path).expect("migration should succeed");
        persist_large_skill_library_fixture(&db_path);

        let summary =
            get_skill_library_summary_for_path(&db_path).expect("skill summary should load");
        let items = list_skill_library_items_for_path(&db_path).expect("items should load");

        // P1C duplicate_count counts extra duplicate sources, not duplicate groups.
        // Three duplicate groups have 2 + 1 + 1 extra sources, so duplicate_count is 4.
        assert_eq!(summary.counts.total_skill_candidates, 210);
        assert_eq!(summary.counts.deduped_skill_count, 206);
        assert_eq!(summary.counts.available_skill_count, 191);
        assert_eq!(summary.counts.needs_attention_count, 15);
        assert_eq!(summary.counts.duplicate_count, 4);
        assert_eq!(summary.counts.broken_count, 4);
        assert_eq!(summary.counts.source_unknown_count, 5);
        assert_eq!(summary.counts.unchecked_count, 3);
        assert_eq!(items.len() as u64, summary.counts.deduped_skill_count);
        assert_eq!(
            items
                .iter()
                .filter(|item| item.status == SkillStatus::Available)
                .count() as u64,
            summary.counts.available_skill_count
        );
        assert_eq!(
            items
                .iter()
                .filter(|item| item.status != SkillStatus::Available)
                .count() as u64,
            summary.counts.needs_attention_count
        );
        assert_eq!(
            items
                .iter()
                .map(|item| item.source_count.saturating_sub(1))
                .sum::<u64>(),
            summary.counts.duplicate_count
        );
        assert_eq!(
            items
                .iter()
                .filter(|item| item.status == SkillStatus::Duplicate)
                .count(),
            3
        );
        assert_eq!(
            items
                .iter()
                .filter(|item| item.status == SkillStatus::SourceUnknown)
                .count(),
            5
        );
        assert_eq!(
            items
                .iter()
                .filter(|item| item.status == SkillStatus::Broken)
                .count(),
            4
        );
        assert_eq!(
            items
                .iter()
                .filter(|item| item.status == SkillStatus::Unchecked)
                .count(),
            3
        );
        assert!(
            items
                .iter()
                .all(|item| !item.original_name.starts_with("unknown-local-skill-like")),
            "unknown-local-resource rows must not be promoted into the product skill list"
        );

        let manifest_duplicate = items
            .iter()
            .find(|item| item.original_name == "duplicate-manifest")
            .expect("manifest duplicate group should exist");
        assert_eq!(manifest_duplicate.status, SkillStatus::Duplicate);
        assert_eq!(manifest_duplicate.source_count, 3);

        let canonical_duplicate = items
            .iter()
            .find(|item| item.original_name == "canonical-dupe")
            .expect("canonical display path duplicate group should exist");
        assert_eq!(canonical_duplicate.status, SkillStatus::Duplicate);
        assert_eq!(canonical_duplicate.source_count, 2);

        let normalized_name_duplicate = items
            .iter()
            .find(|item| item.original_name.eq_ignore_ascii_case("name based skill"))
            .expect("normalized name duplicate group should exist");
        assert_eq!(normalized_name_duplicate.status, SkillStatus::Duplicate);
        assert_eq!(normalized_name_duplicate.source_count, 2);

        let stable_key_item = items
            .iter()
            .find(|item| item.original_name == "stable-key-update")
            .expect("stable key update should keep one product item");
        assert_eq!(stable_key_item.status, SkillStatus::Available);
        assert_eq!(stable_key_item.source_count, 1);
        assert_eq!(
            stable_key_item.short_purpose,
            "updated stable key update verifier"
        );

        cleanup_db(db_path);
    }

    #[test]
    fn skill_library_summary_matches_full_product_list_not_corpus_pages_or_filters() {
        let db_path = temp_db_path("skill-library-scale-summary-list-match");
        initialize_database(&db_path).expect("migration should succeed");
        persist_large_skill_library_fixture(&db_path);

        let first_corpus_page = list_resources_by_scope_for_path(
            &db_path,
            ResourceCorpusQuery {
                scope_kind: None,
                scope_id: None,
                project_label: None,
                scan_source_id: None,
                resource_kind: Some("skill".to_string()),
                limit: Some(5),
                offset: Some(0),
            },
        )
        .expect("paged corpus resources should load");
        assert_eq!(first_corpus_page.len(), 5);

        let summary =
            get_skill_library_summary_for_path(&db_path).expect("skill summary should load");
        let items = list_skill_library_items_for_path(&db_path).expect("items should load");
        let filtered_available = items
            .iter()
            .filter(|item| item.status == SkillStatus::Available)
            .collect::<Vec<_>>();

        assert_eq!(summary.counts.deduped_skill_count, items.len() as u64);
        assert_eq!(
            summary.counts.available_skill_count,
            filtered_available.len() as u64
        );
        assert_eq!(summary.counts.total_skill_candidates, 210);
        assert_eq!(
            first_corpus_page.len() as u64,
            5,
            "corpus paging must not define product summary counts"
        );

        cleanup_db(db_path);
    }

    #[test]
    fn skill_detail_for_scale_duplicate_includes_safe_duplicate_and_source_summaries() {
        let db_path = temp_db_path("skill-library-scale-detail");
        initialize_database(&db_path).expect("migration should succeed");
        persist_large_skill_library_fixture(&db_path);

        let duplicate = list_skill_library_items_for_path(&db_path)
            .expect("items should load")
            .into_iter()
            .find(|item| item.original_name == "canonical-dupe")
            .expect("canonical duplicate should exist");
        let detail =
            get_skill_detail_for_path(&db_path, &duplicate.id).expect("detail should load");

        assert_eq!(detail.item.status, SkillStatus::Duplicate);
        assert_eq!(detail.source_summaries.len(), 2);
        assert_eq!(detail.related_duplicate_sources.len(), 1);
        assert!(detail
            .source_summaries
            .iter()
            .all(|source| !source.path_hint.contains("/Users/example")));
        assert!(detail
            .source_summaries
            .iter()
            .flat_map(|source| [
                source.source_label.as_str(),
                source.source_kind_label.as_str()
            ])
            .all(|label| matches!(
                label,
                "Codex"
                    | "Claude"
                    | "Agents"
                    | "项目来源"
                    | "手动添加"
                    | "全局来源"
                    | "来源不明"
                    | "多来源"
                    | "本地共享"
                    | "插件"
            )));

        let serialized =
            serde_json::to_string(&detail).expect("detail should serialize to product JSON");
        assert_no_large_fixture_secrets(&serialized);

        cleanup_db(db_path);
    }

    #[test]
    fn skill_library_product_output_redacts_secret_like_segments_env_values_and_raw_logs() {
        let db_path = temp_db_path("skill-library-scale-redaction");
        initialize_database(&db_path).expect("migration should succeed");
        persist_large_skill_library_fixture(&db_path);

        let summary =
            get_skill_library_summary_for_path(&db_path).expect("skill summary should load");
        let items = list_skill_library_items_for_path(&db_path).expect("items should load");
        let sensitive_item = items
            .iter()
            .find(|item| {
                item.status == SkillStatus::Broken && item.primary_path_hint.contains("[sensitive]")
            })
            .expect("sensitive broken item should exist");
        let detail =
            get_skill_detail_for_path(&db_path, &sensitive_item.id).expect("detail should load");

        assert_eq!(sensitive_item.original_name, "[sensitive]");
        assert!(detail
            .safe_advanced_metadata_summary
            .iter()
            .all(|row| !row.value.contains("super-secret-token")));
        assert!(detail
            .findings
            .iter()
            .all(|finding| finding.detail == "已隐藏敏感内容。"));

        let serialized_summary = serde_json::to_string(&summary).expect("summary should serialize");
        let serialized_items = serde_json::to_string(&items).expect("items should serialize");
        let serialized_detail = serde_json::to_string(&detail).expect("detail should serialize");

        assert_no_large_fixture_secrets(&serialized_summary);
        assert_no_large_fixture_secrets(&serialized_items);
        assert_no_large_fixture_secrets(&serialized_detail);

        cleanup_db(db_path);
    }

    fn persist_skill_library_fixture(db_path: &PathBuf) {
        persist_scan_job_for_path(
            db_path,
            skill_library_job(
                "job-skill-codex",
                1,
                codex_source(),
                vec![
                    PersistScanResourceInput {
                        name: "SKILL.md".to_string(),
                        resource_kind: "skill".to_string(),
                        description: "路径或文件名匹配技能资源。".to_string(),
                        primary_type: "file".to_string(),
                        risk_level: "low".to_string(),
                        boundary_labels: vec![
                            "read-only".to_string(),
                            "no-content-read".to_string(),
                        ],
                        relative_path: "skills/writer/SKILL.md".to_string(),
                        display_path: "skills/writer/SKILL.md".to_string(),
                        extension: Some("md".to_string()),
                        entry_type: "file".to_string(),
                        size_bytes: Some(58),
                        modified_at_ms: Some(1_725_100_000_000),
                        classification_reason: "路径或文件名匹配技能资源。".to_string(),
                        sensitive_path_redacted: false,
                        risk_labels: vec!["metadata-only".to_string()],
                    },
                    PersistScanResourceInput {
                        name: "SKILL.md".to_string(),
                        resource_kind: "skill".to_string(),
                        description: "路径或文件名匹配技能资源。".to_string(),
                        primary_type: "file".to_string(),
                        risk_level: "low".to_string(),
                        boundary_labels: vec![
                            "read-only".to_string(),
                            "no-content-read".to_string(),
                        ],
                        relative_path: "plugins/cache/openai/skills/writer/SKILL.md".to_string(),
                        display_path: "plugins/cache/openai/skills/writer/SKILL.md".to_string(),
                        extension: Some("md".to_string()),
                        entry_type: "file".to_string(),
                        size_bytes: Some(64),
                        modified_at_ms: Some(1_725_100_000_500),
                        classification_reason: "路径或文件名匹配技能资源。".to_string(),
                        sensitive_path_redacted: false,
                        risk_labels: vec!["metadata-only".to_string()],
                    },
                    PersistScanResourceInput {
                        name: "[sensitive]".to_string(),
                        resource_kind: "skill".to_string(),
                        description: "路径或文件名匹配技能资源。".to_string(),
                        primary_type: "file".to_string(),
                        risk_level: "high".to_string(),
                        boundary_labels: vec![
                            "read-only".to_string(),
                            "no-content-read".to_string(),
                            "redacted".to_string(),
                        ],
                        relative_path: "[sensitive]/SKILL.md".to_string(),
                        display_path: "[sensitive]/SKILL.md".to_string(),
                        extension: Some("md".to_string()),
                        entry_type: "file".to_string(),
                        size_bytes: Some(72),
                        modified_at_ms: Some(1_725_100_000_700),
                        classification_reason: "路径或文件名匹配技能资源。".to_string(),
                        sensitive_path_redacted: true,
                        risk_labels: vec![
                            "metadata-only".to_string(),
                            "sensitive-path-redacted".to_string(),
                        ],
                    },
                ],
            ),
        )
        .expect("codex skills should persist");

        persist_scan_job_for_path(
            db_path,
            skill_library_job(
                "job-skill-project",
                2,
                project_source(),
                vec![PersistScanResourceInput {
                    name: "local-helper".to_string(),
                    resource_kind: "skill".to_string(),
                    description: "路径或文件名匹配技能资源。".to_string(),
                    primary_type: "file".to_string(),
                    risk_level: "low".to_string(),
                    boundary_labels: vec!["read-only".to_string(), "no-content-read".to_string()],
                    relative_path: "local-skills/local-helper/SKILL.md".to_string(),
                    display_path: "local-skills/local-helper/SKILL.md".to_string(),
                    extension: Some("md".to_string()),
                    entry_type: "file".to_string(),
                    size_bytes: Some(96),
                    modified_at_ms: Some(1_725_100_002_000),
                    classification_reason: "路径或文件名匹配技能资源。".to_string(),
                    sensitive_path_redacted: false,
                    risk_labels: vec!["metadata-only".to_string()],
                }],
            ),
        )
        .expect("project skill should persist");

        persist_scan_job_for_path(
            db_path,
            skill_library_job(
                "job-skill-unknown",
                3,
                unknown_source(),
                vec![PersistScanResourceInput {
                    name: "mystery".to_string(),
                    resource_kind: "skill".to_string(),
                    description: "路径或文件名匹配技能资源。".to_string(),
                    primary_type: "file".to_string(),
                    risk_level: "low".to_string(),
                    boundary_labels: vec!["read-only".to_string(), "no-content-read".to_string()],
                    relative_path: "mystery/SKILL.md".to_string(),
                    display_path: "mystery/SKILL.md".to_string(),
                    extension: Some("md".to_string()),
                    entry_type: "file".to_string(),
                    size_bytes: Some(48),
                    modified_at_ms: Some(1_725_100_003_000),
                    classification_reason: "路径或文件名匹配技能资源。".to_string(),
                    sensitive_path_redacted: false,
                    risk_labels: vec!["metadata-only".to_string()],
                }],
            ),
        )
        .expect("unknown skill should persist");
    }

    fn persist_large_skill_library_fixture(db_path: &PathBuf) {
        let mut codex_resources = Vec::new();
        for index in 0..180 {
            codex_resources.push(skill_resource(
                "SKILL.md",
                "skill",
                &format!("skills/codex-available-{index:03}/SKILL.md"),
                &format!("skills/codex-available-{index:03}/SKILL.md"),
                "usable Codex skill metadata",
                "low",
                1_725_200_000_000 + index,
                false,
                vec!["metadata-only"],
            ));
        }
        codex_resources.push(skill_resource(
            "SKILL.md",
            "skill",
            "skills/duplicate-manifest/SKILL.md",
            "skills/duplicate-manifest/SKILL.md",
            "manifest duplicate skill metadata",
            "low",
            1_725_200_001_000,
            false,
            vec!["metadata-only"],
        ));
        codex_resources.push(skill_resource(
            "SKILL.md",
            "skill",
            "aliases/temporary-canonical-name/SKILL.md",
            "skills/canonical-dupe/SKILL.md",
            "canonical path duplicate skill metadata",
            "low",
            1_725_200_001_100,
            false,
            vec!["metadata-only"],
        ));
        codex_resources.push(skill_resource(
            "Name Based Skill",
            "skill",
            "metadata/name-based-skill.codex.json",
            "metadata/name-based-skill.codex.json",
            "normalized name duplicate skill metadata",
            "low",
            1_725_200_001_200,
            false,
            vec!["metadata-only"],
        ));
        codex_resources.push(skill_resource(
            "stable-key-update",
            "skill",
            "skills/stable-key-update/SKILL.md",
            "skills/stable-key-update/SKILL.md",
            "initial stable key update verifier",
            "low",
            1_725_200_001_300,
            false,
            vec!["metadata-only"],
        ));
        for index in 0..8 {
            codex_resources.push(skill_resource(
                &format!("unknown-local-skill-like-{index:02}"),
                "unknown-local-resource",
                &format!("unknown-local-skill-like-{index:02}/SKILL.md"),
                &format!("unknown-local-skill-like-{index:02}/SKILL.md"),
                "unknown local resource that looks skill-like by path only",
                "low",
                1_725_200_002_000 + index,
                false,
                vec!["metadata-only"],
            ));
        }

        persist_scan_job_for_path(
            db_path,
            skill_library_job("job-large-codex", 20, codex_source(), codex_resources),
        )
        .expect("large codex fixture should persist");

        persist_scan_job_for_path(
            db_path,
            skill_library_job(
                "job-large-codex-update",
                21,
                codex_source(),
                vec![skill_resource(
                    "stable-key-update",
                    "skill",
                    "skills/stable-key-update/SKILL.md",
                    "skills/stable-key-update/SKILL.md",
                    "updated stable key update verifier",
                    "low",
                    1_725_200_010_000,
                    false,
                    vec!["metadata-only"],
                )],
            ),
        )
        .expect("stable key update fixture should persist");

        persist_scan_job_for_path(
            db_path,
            skill_library_job(
                "job-large-claude",
                22,
                claude_source(),
                vec![
                    skill_resource(
                        "SKILL.md",
                        "skill",
                        "skills/duplicate-manifest/SKILL.md",
                        "skills/duplicate-manifest/SKILL.md",
                        "manifest duplicate skill metadata",
                        "low",
                        1_725_200_011_000,
                        false,
                        vec!["metadata-only"],
                    ),
                    skill_resource(
                        "SKILL.md",
                        "skill",
                        "skills/canonical-dupe/SKILL.md",
                        "skills/canonical-dupe/SKILL.md",
                        "canonical path duplicate skill metadata",
                        "low",
                        1_725_200_011_100,
                        false,
                        vec!["metadata-only"],
                    ),
                    skill_resource(
                        "name based skill",
                        "skill",
                        "metadata/name-based-skill.claude.json",
                        "metadata/name-based-skill.claude.json",
                        "normalized name duplicate skill metadata",
                        "low",
                        1_725_200_011_200,
                        false,
                        vec!["metadata-only"],
                    ),
                ],
            ),
        )
        .expect("large claude fixture should persist");

        let mut project_resources = Vec::new();
        for index in 0..10 {
            project_resources.push(skill_resource(
                "SKILL.md",
                "skill",
                &format!("project-skills/project-available-{index:02}/SKILL.md"),
                &format!("project-skills/project-available-{index:02}/SKILL.md"),
                "usable project skill metadata",
                "low",
                1_725_200_020_000 + index,
                false,
                vec!["metadata-only"],
            ));
        }
        project_resources.push(skill_resource(
            "SKILL.md",
            "skill",
            "project-skills/duplicate-manifest/SKILL.md",
            "project-skills/duplicate-manifest/SKILL.md",
            "manifest duplicate skill metadata",
            "low",
            1_725_200_020_900,
            false,
            vec!["metadata-only"],
        ));
        persist_scan_job_for_path(
            db_path,
            skill_library_job("job-large-project", 23, project_source(), project_resources),
        )
        .expect("large project fixture should persist");

        let unknown_resources = (0..5)
            .map(|index| {
                skill_resource(
                    "SKILL.md",
                    "skill",
                    &format!("unknown-source/source-unknown-{index:02}/SKILL.md"),
                    &format!("unknown-source/source-unknown-{index:02}/SKILL.md"),
                    "source unknown skill metadata",
                    "low",
                    1_725_200_030_000 + index,
                    false,
                    vec!["metadata-only"],
                )
            })
            .collect::<Vec<_>>();
        persist_scan_job_for_path(
            db_path,
            skill_library_job("job-large-unknown", 24, unknown_source(), unknown_resources),
        )
        .expect("large unknown fixture should persist");

        let broken_resources = vec![
            skill_resource(
                "SKILL.md",
                "skill",
                "broken/broken-risk-00/SKILL.md",
                "broken/broken-risk-00/SKILL.md",
                "broken skill metadata",
                "high",
                1_725_200_040_000,
                false,
                vec!["metadata-only"],
            ),
            skill_resource(
                "SKILL.md",
                "skill",
                "broken/broken-risk-01/SKILL.md",
                "broken/broken-risk-01/SKILL.md",
                "broken skill metadata",
                "high",
                1_725_200_040_001,
                false,
                vec!["metadata-only"],
            ),
            skill_resource(
                "SKILL.md",
                "skill",
                "broken/broken-redacted-02/SKILL.md",
                "broken/broken-redacted-02/SKILL.md",
                "broken skill metadata",
                "medium",
                1_725_200_040_002,
                true,
                vec!["metadata-only", "sensitive-path-redacted"],
            ),
            skill_resource(
                "SKILL.md",
                "skill",
                "leaks/super-secret-token/SKILL.md",
                "leaks/super-secret-token/SKILL.md",
                "broken skill metadata with unsafe persisted path",
                "low",
                1_725_200_040_003,
                false,
                vec!["metadata-only"],
            ),
        ];
        persist_scan_job_for_path(
            db_path,
            skill_library_job("job-large-broken", 25, manual_source(), broken_resources),
        )
        .expect("large broken fixture should persist");
        insert_large_fixture_raw_findings(db_path);

        persist_scan_job_for_path(
            db_path,
            skill_library_job_with_status(
                "job-large-unchecked",
                "running",
                26,
                agents_source(),
                (0..3)
                    .map(|index| {
                        skill_resource(
                            "SKILL.md",
                            "skill",
                            &format!("agents/unchecked-{index:02}/SKILL.md"),
                            &format!("agents/unchecked-{index:02}/SKILL.md"),
                            "unchecked skill metadata",
                            "low",
                            1_725_200_050_000 + index,
                            false,
                            vec!["metadata-only"],
                        )
                    })
                    .collect(),
            ),
        )
        .expect("large unchecked fixture should persist");
    }

    fn insert_large_fixture_raw_findings(db_path: &PathBuf) {
        let conn = rusqlite::Connection::open(db_path).expect("db should open");
        let resource_id: String = conn
            .query_row(
                "SELECT resource_id FROM resource_locations WHERE relative_path = ?1 LIMIT 1",
                ["leaks/super-secret-token/SKILL.md"],
                |row| row.get(0),
            )
            .expect("sensitive fixture resource should exist");
        conn.execute(
            "INSERT INTO resource_findings (
                id, resource_id, scan_job_id, finding_kind, severity, message, safe_detail_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                "finding:large-raw-log",
                resource_id,
                "job-large-broken",
                "raw-log",
                "high",
                "raw log: permission denied from worker stdout",
                "{\"log\":\"raw log: permission denied from worker stdout\"}",
            ],
        )
        .expect("raw log finding should persist");
        conn.execute(
            "INSERT INTO resource_findings (
                id, resource_id, scan_job_id, finding_kind, severity, message, safe_detail_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                "finding:large-env-value",
                resource_id,
                "job-large-broken",
                "env-value",
                "high",
                "OPENAI_API_KEY=sk-live-secret and token=super-secret-token",
                "{\"OPENAI_API_KEY\":\"sk-live-secret\",\"token\":\"super-secret-token\"}",
            ],
        )
        .expect("env value finding should persist");
    }

    fn assert_no_large_fixture_secrets(serialized: &str) {
        for forbidden in [
            "super-secret-token",
            "sk-live-secret",
            "OPENAI_API_KEY",
            "token=",
            "raw log",
            "worker stdout",
            "/Users/example",
            "secret-token-root",
        ] {
            assert!(
                !serialized.contains(forbidden),
                "product output must not serialize forbidden fixture text: {forbidden}"
            );
        }
    }

    fn skill_library_job(
        job_id: &str,
        sequence: u64,
        source: PersistScanSourceInput,
        resources: Vec<PersistScanResourceInput>,
    ) -> PersistScanJobInput {
        skill_library_job_with_status(job_id, "completed", sequence, source, resources)
    }

    fn skill_library_job_with_status(
        job_id: &str,
        status: &str,
        sequence: u64,
        source: PersistScanSourceInput,
        resources: Vec<PersistScanResourceInput>,
    ) -> PersistScanJobInput {
        PersistScanJobInput {
            id: job_id.to_string(),
            status: status.to_string(),
            profile_id: source.profile_id.clone(),
            started_at_ms: 1_725_100_000_000 + sequence,
            finished_at_ms: if status == "completed" {
                Some(1_725_100_000_000 + sequence * 1_000)
            } else {
                None
            },
            elapsed_ms: 1_000,
            requested_by: "custom-directory-scan".to_string(),
            total_entries: resources.len() as u64,
            matched_resources: resources.len() as u64,
            skipped_entries: 0,
            error_count: 0,
            cancelled: false,
            summary_json: "{\"metadataOnly\":true,\"contentStored\":false,\"note\":\"super-secret-token must not appear outside this fixture helper\"}".to_string(),
            source,
            resources,
            skips: Vec::new(),
            errors: Vec::new(),
        }
    }

    fn skill_resource(
        name: &str,
        resource_kind: &str,
        relative_path: &str,
        display_path: &str,
        description: &str,
        risk_level: &str,
        modified_at_ms: u64,
        sensitive_path_redacted: bool,
        risk_labels: Vec<&str>,
    ) -> PersistScanResourceInput {
        PersistScanResourceInput {
            name: name.to_string(),
            resource_kind: resource_kind.to_string(),
            description: description.to_string(),
            primary_type: "file".to_string(),
            risk_level: risk_level.to_string(),
            boundary_labels: vec!["read-only".to_string(), "no-content-read".to_string()],
            relative_path: relative_path.to_string(),
            display_path: display_path.to_string(),
            extension: Some("md".to_string()),
            entry_type: "file".to_string(),
            size_bytes: Some(128),
            modified_at_ms: Some(modified_at_ms),
            classification_reason: "路径或文件名匹配技能资源。".to_string(),
            sensitive_path_redacted,
            risk_labels: risk_labels.into_iter().map(ToString::to_string).collect(),
        }
    }

    fn codex_source() -> PersistScanSourceInput {
        PersistScanSourceInput {
            id: Some("source-codex-skills".to_string()),
            display_name: "Codex Skills".to_string(),
            root_path: "/Users/example/.codex".to_string(),
            root_display_path: "~/.codex".to_string(),
            profile_id: "skills-prompts-workspace".to_string(),
            source_kind: "custom-directory".to_string(),
            project_label: None,
        }
    }

    fn claude_source() -> PersistScanSourceInput {
        PersistScanSourceInput {
            id: Some("source-claude-skills".to_string()),
            display_name: "Claude Skills".to_string(),
            root_path: "/Users/example/.claude".to_string(),
            root_display_path: "~/.claude".to_string(),
            profile_id: "skills-prompts-workspace".to_string(),
            source_kind: "custom-directory".to_string(),
            project_label: None,
        }
    }

    fn agents_source() -> PersistScanSourceInput {
        PersistScanSourceInput {
            id: Some("source-agents-skills".to_string()),
            display_name: "Agents Skills".to_string(),
            root_path: "/Users/example/.agents".to_string(),
            root_display_path: "~/.agents".to_string(),
            profile_id: "skills-prompts-workspace".to_string(),
            source_kind: "custom-directory".to_string(),
            project_label: None,
        }
    }

    fn manual_source() -> PersistScanSourceInput {
        PersistScanSourceInput {
            id: Some("source-manual-skills".to_string()),
            display_name: "Manual Skills".to_string(),
            root_path: "/Users/example/manual-skills".to_string(),
            root_display_path: "~/manual-skills".to_string(),
            profile_id: "custom-folder".to_string(),
            source_kind: "custom-directory".to_string(),
            project_label: None,
        }
    }

    fn project_source() -> PersistScanSourceInput {
        PersistScanSourceInput {
            id: Some("source-project-skills".to_string()),
            display_name: "Project Alpha".to_string(),
            root_path: "/Users/example/project-alpha".to_string(),
            root_display_path: "~/project-alpha".to_string(),
            profile_id: "project-root".to_string(),
            source_kind: "custom-directory".to_string(),
            project_label: Some("Project Alpha".to_string()),
        }
    }

    fn unknown_source() -> PersistScanSourceInput {
        PersistScanSourceInput {
            id: Some("source-unknown-skills".to_string()),
            display_name: "unknown".to_string(),
            root_path: "/Users/example/unknown".to_string(),
            root_display_path: "未记录".to_string(),
            profile_id: "custom-folder".to_string(),
            source_kind: "unknown".to_string(),
            project_label: None,
        }
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
