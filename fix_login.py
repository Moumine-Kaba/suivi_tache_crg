# -*- coding: utf-8 -*-
with open('src/pages/Login.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find start (line with "Titre mobile") and end (line with closing </div> before "Message d'erreur")
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if 'Titre mobile' in line and 'compact' in line:
        start_idx = i  # We want to replace from the next line (the div)
    if start_idx is not None and end_idx is None and i > start_idx:
        if "Message d'erreur" in line or 'Message d\'erreur' in line:
            end_idx = i - 1  # Back up to include the closing </div>
            break

# Alternative: find the block by content
for i, line in enumerate(lines):
    if 'sm:hidden relative flex-shrink-0 mb-6' in line and start_idx is None:
        start_idx = i
    if start_idx is not None and i > start_idx and 'Entrez vos identifiants' in line:
        # Find the closing of this block - look for the </div> that closes our div
        for j in range(i+1, min(i+10, len(lines))):
            if lines[j].strip() == '</div>' or (lines[j].strip().startswith('</div>') and 'sm:hidden' not in lines[j]):
                # Check if next non-empty is Message d'erreur
                for k in range(j+1, min(j+5, len(lines))):
                    if 'Message d'erreur' in lines[k] or "Message d'erreur" in lines[k]:
                        end_idx = j
                        break
                break
        break

if start_idx is not None:
    # Find the actual end - the </div> that closes our block
    depth = 0
    end_idx = start_idx
    for i in range(start_idx, len(lines)):
        if '<div' in lines[i]: depth += 1
        if '</div>' in lines[i]: 
            depth -= 1
            if depth == 0:
                end_idx = i
                break
    
    new_block = '''          <div className="sm:hidden relative flex-shrink-0 mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Connexion</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Entrez vos identifiants</p>
          </div>

'''
    new_lines = lines[:start_idx] + [new_block] + lines[end_idx+1:]
    with open('src/pages/Login.jsx', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print('Replacement successful')
else:
    print('Start not found')
