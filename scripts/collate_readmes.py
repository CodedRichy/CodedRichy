import os

def collate_readmes():
    github_dir = r"C:\Users\rishi\Documents\GitHub"
    output_file = r"C:\Users\rishi\Documents\GitHub\CodedRichy\all_projects_readmes.log"
    
    # Common README filenames to look for
    readme_names = ['README.md', 'readme.md', 'README.txt', 'README', 'readme.txt']
    
    print(f"Scanning projects in: {github_dir}")
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write("="*80 + "\n")
        outfile.write("PROJECTS README LOG\n")
        outfile.write(f"Generated on: {os.path.basename(github_dir)}\n")
        outfile.write("="*80 + "\n\n")
        
        # Get all subdirectories
        projects = [d for d in os.listdir(github_dir) if os.path.isdir(os.path.join(github_dir, d))]
        projects.sort()
        
        found_count = 0
        
        for project in projects:
            project_path = os.path.join(github_dir, project)
            
            # Skip hidden directories like .git
            if project.startswith('.'):
                continue
                
            # Look for README
            readme_path = None
            for name in readme_names:
                potential_path = os.path.join(project_path, name)
                if os.path.isfile(potential_path):
                    readme_path = potential_path
                    break
            
            if readme_path:
                print(f"Reading README for: {project}")
                outfile.write(f"\n[ PROJECT: {project.upper()} ]\n")
                outfile.write("-" * 40 + "\n")
                try:
                    with open(readme_path, 'r', encoding='utf-8', errors='ignore') as infile:
                        outfile.write(infile.read())
                    outfile.write("\n\n" + "-" * 80 + "\n")
                    found_count += 1
                except Exception as e:
                    outfile.write(f"ERROR READING README: {str(e)}\n\n")
            else:
                # To keep track of projects without readmes
                outfile.write(f"\n[ PROJECT: {project.upper()} ]\n")
                outfile.write("No README file found.\n")
                outfile.write("-" * 80 + "\n")

    print(f"\nSuccess! Read {found_count} READMEs.")
    print(f"Log saved to: {output_file}")

if __name__ == "__main__":
    collate_readmes()
