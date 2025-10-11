# Tauri v1 to v2 Migration - Manual Testing Checklist

## 🎯 **Critical Path Testing**

### ✅ **App Launch & Window Management**
- [ ] App launches without errors
- [ ] Window becomes visible automatically (no white screen)
- [ ] Window can be minimized/maximized/closed
- [ ] Window positioning works correctly
- [ ] macOS title bar overlay style displays properly

### ✅ **Core Library Functions**
- [ ] First-time setup flow works (library selection)
- [ ] Can switch between existing libraries
- [ ] Library validation works (`clb_query_is_path_valid_library`)
- [ ] Can create new library (`clb_cmd_create_library`)
- [ ] Library path persistence across app restarts

### ✅ **Book Management**
- [ ] Books list loads (`clb_query_list_all_books`)
- [ ] Book details display correctly
- [ ] Can add new books via file dialog
- [ ] Book metadata editing works (`clb_cmd_update_book`)
- [ ] Book creation works (`clb_cmd_create_book`)
- [ ] Book deletion works (if implemented)

### ✅ **Author Management**
- [ ] Authors list loads (`clb_query_list_all_authors`)
- [ ] Can create new authors (`clb_cmd_create_authors`)
- [ ] Author editing works (`clb_cmd_update_author`)
- [ ] Author deletion works (`clb_cmd_delete_author`)

### ✅ **File Operations**
- [ ] File dialogs open correctly (library selection, book import)
- [ ] File type validation (`clb_query_is_file_importable`)
- [ ] Metadata extraction (`clb_query_importable_file_metadata`)
- [ ] Supported file types list (`clb_query_list_all_filetypes`)

## 🔧 **Plugin Functionality**

### ✅ **Dialog Plugin**
- [ ] File selection dialogs work
- [ ] Directory selection works
- [ ] Message dialogs display
- [ ] Confirmation dialogs work

### ✅ **File System Plugin**
- [ ] Reading files works
- [ ] Writing files works
- [ ] Directory operations work
- [ ] File existence checks work

### ✅ **Shell Plugin**
- [ ] Opening URLs in browser works
- [ ] External command execution (if used)

### ✅ **Clipboard Plugin**
- [ ] Copy to clipboard works
- [ ] Read from clipboard works

### 🚧 **Drag & Drop Plugin**
- [ ] Drag files into app window
- [ ] Drop event triggers correctly
- [ ] File paths are correctly received
- [ ] Multiple files can be dropped
- [ ] Invalid file types are rejected
- [ ] Drop triggers book import flow

## ⚠️ **Known Issues to Verify**

### 🔴 **Currently Disabled Features**
- [ ] **Settings Persistence**: Check if settings save/load properly
  - [ ] Library paths persist
  - [ ] Theme preferences save
  - [ ] Window size/position saves
  - [ ] Other user preferences

### 🟡 **Developer Experience**
- [ ] **TypeScript Types**: Commands work but no auto-completion
  - [ ] `invoke()` calls work without type safety
  - [ ] Manual type checking required

### 🟢 **Working But Needs Testing**
- [ ] **Resource Loading**: Bundled files (like default library ZIP)
- [ ] **HTTP Server Mode**: `--server` flag functionality
- [ ] **Error Handling**: Proper error messages display

## 🧪 **Stress Testing**

### **Performance**
- [ ] Large library loading (1000+ books)
- [ ] Multiple rapid operations
- [ ] Memory usage during extended use
- [ ] App responsiveness during file operations

### **Edge Cases**
- [ ] Invalid library paths
- [ ] Corrupted book files
- [ ] Network drive libraries
- [ ] Special characters in file names
- [ ] Very long file paths

### **Platform Specific (macOS)**
- [ ] App signing and notarization
- [ ] Sandboxing compatibility
- [ ] File permissions work correctly
- [ ] Native menu integration

## 📋 **Test Results Template**

```
## Test Session: [Date]
**Tester**: [Name]
**Platform**: [macOS/Windows/Linux + version]
**Build**: [dev/production]

### Critical Path Results:
- App Launch: ✅/❌
- Library Functions: ✅/❌
- Book Management: ✅/❌
- Author Management: ✅/❌
- File Operations: ✅/❌

### Plugin Results:
- Dialog: ✅/❌
- File System: ✅/❌
- Shell: ✅/❌
- Clipboard: ✅/❌
- Drag & Drop: ✅/❌

### Issues Found:
1. [Issue description]
2. [Issue description]

### Overall Status:
- [ ] Ready for production
- [ ] Needs minor fixes
- [ ] Major issues found
```

## 🎯 **Success Criteria**

### **Minimum Viable (Release Blocker)**
- ✅ App launches and window shows
- ✅ Basic library operations work
- ✅ Can view and manage books
- ✅ File dialogs work

### **Full Feature Parity (v1 equivalent)**
- ✅ All v1 features working
- ✅ Drag & drop fully functional
- ✅ Settings persistence working
- ✅ Performance equivalent to v1

### **Enhanced (v2 benefits)**
- ✅ Improved permissions security
- ✅ Better plugin architecture
- ✅ TypeScript type safety
- ✅ Mobile support ready (future)

## 🚨 **Known Workarounds**

1. **Settings**: Currently using localStorage fallback instead of file-based persistence
2. **TypeScript**: Manual type definitions until tauri-specta v2 is stable
3. **Drag & Drop**: Using event-based API instead of v1 window events

## 📞 **Reporting Issues**

When reporting issues, include:
- Exact steps to reproduce
- Expected vs actual behavior
- Browser console errors (if any)
- Rust console output
- Platform and build information