mod scanner;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(scanner::ScanState::default())
        .invoke_handler(tauri::generate_handler![
            scanner::pick_scan_directory,
            scanner::scan_custom_directory,
            scanner::get_scan_policy
        ])
        .run(tauri::generate_context!())
        .expect("error while running AIOS Desktop");
}
