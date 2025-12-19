#!/usr/bin/env python3
"""
Script to move component files to new modular structure and update imports
"""
import os
import re
import shutil

# Define file mappings: (old_path, new_path, import_updates)
mappings = [
    # User components
    ("components/UserDashboard.jsx", "components/user/UserDashboard.jsx", {"../api": "../../api", "../context/AuthContext": "../../context/AuthContext"}),
    ("components/UserProfile.jsx", "components/user/UserProfile.jsx", {"../api": "../../api", "../context/AuthContext": "../../context/AuthContext"}),
    ("components/UserProfileEdit.jsx", "components/user/UserProfileEdit.jsx", {"../api": "../../api"}),
    ("components/UserProfileView.jsx", "components/user/UserProfileView.jsx", {"../api": "../../api"}),
    
    # Startup components
    ("components/Dashboard.jsx", "components/startup/Dashboard.jsx", {"../context/AuthContext": "../../context/AuthContext"}),
    ("components/CompleteProfile.jsx", "components/startup/CompleteProfile.jsx", {"../api": "../../api", "../context/AuthContext": "../../context/AuthContext"}),
    ("components/StartupApplication.jsx", "components/startup/StartupApplication.jsx", {"../api": "../../api", "../context/AuthContext": "../../context/AuthContext"}),
    ("components/SubmittedApplication.jsx", "components/startup/SubmittedApplication.jsx", {"../api": "../../api"}),
    ("components/StartupOwnerProfile.jsx", "components/startup/StartupOwnerProfile.jsx", {"../api": "../../api", "../context/AuthContext": "../../context/AuthContext"}),
    ("components/ApplicationsList.jsx", "components/startup/ApplicationsList.jsx", {"../api": "../../api"}),
    ("components/ApplicationView.jsx", "components/startup/ApplicationView.jsx", {"../api": "../../api"}),
]

def update_imports(content, updates):
    """Update import paths in file content"""
    for old_path, new_path in updates.items():
        # Match import statements
        content = re.sub(
            rf"from\s+['\"]{re.escape(old_path)}['\"]",
            f"from '{new_path}'",
            content
        )
        content = re.sub(
            rf"from\s+['\"]{re.escape(old_path)}['\"]",
            f'from "{new_path}"',
            content
        )
    return content

def main():
    base_dir = "src"
    
    for old_path, new_path, updates in mappings:
        old_full = os.path.join(base_dir, old_path)
        new_full = os.path.join(base_dir, new_path)
        
        if not os.path.exists(old_full):
            print(f"⚠️  Skipping {old_path} - file not found")
            continue
            
        # Create directory if needed
        os.makedirs(os.path.dirname(new_full), exist_ok=True)
        
        # Read, update, and write
        with open(old_full, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = update_imports(content, updates)
        
        with open(new_full, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Created {new_path}")

if __name__ == "__main__":
    main()

