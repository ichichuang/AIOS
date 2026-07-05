mod resource_store;
mod scanner;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(scanner::ScanState::default())
        .setup(|app| {
            app.manage(resource_store::ResourceStoreState::from_app_handle(
                app.handle(),
            )?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            resource_store::get_resource_store_status,
            resource_store::list_scan_sources,
            resource_store::list_persisted_scan_jobs,
            resource_store::get_resource_library_summary,
            resource_store::list_persisted_resources,
            resource_store::list_resource_corpus_scopes,
            resource_store::list_project_scopes,
            resource_store::get_active_resource_corpus_summary,
            resource_store::list_resources_by_scope,
            resource_store::list_resources_by_kind,
            resource_store::get_resource_detail,
            resource_store::get_resource_counts_by_scope,
            resource_store::clear_resource_library,
            resource_store::update_scan_source,
            resource_store::remove_scan_source,
            scanner::pick_scan_directory,
            scanner::add_scan_sources,
            scanner::add_discovery_scan_sources,
            scanner::scan_custom_directory,
            scanner::start_custom_scan_job,
            scanner::cancel_scan_job,
            scanner::get_scan_job_snapshot,
            scanner::start_scan_sources_batch,
            scanner::cancel_scan_batch,
            scanner::get_scan_batch_snapshot,
            scanner::get_scan_policy,
            scanner::get_scan_profiles
        ])
        .run(tauri::generate_context!())
        .expect("error while running AIOS Desktop");
}
