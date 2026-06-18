import sys

with open('src/App.jsx', 'r') as f:
    lines = f.readlines()

start_idx = 2336
mid_idx = 2440
end_idx = 2559

pre = lines[:start_idx]
top_panel = lines[start_idx+1:mid_idx]
bottom_panel = lines[mid_idx:end_idx]
post = lines[end_idx:]

# Modify wrapper
wrapper = '        <div className="flex-1 flex flex-row overflow-hidden relative">\n'

# Modify Top panel to be Right panel
# Top panel starts with:
#           {/* Top Panel of Composer: Fixed Selected Tiles Box */}
#           <div className="h-[280px] border-b border-slate-200 bg-slate-50 p-4 flex flex-col flex-shrink-0 shadow-inner z-10">
new_top_panel = []
for line in top_panel:
    if 'Top Panel of Composer' in line:
        line = line.replace('Top Panel of Composer: Fixed Selected Tiles Box', 'Right Panel of Composer: Fixed Selected Tiles Box')
    elif 'h-[280px] border-b border-slate-200' in line:
        line = line.replace('h-[280px] border-b', 'w-[400px] border-l')
    
    new_top_panel.append(line)

# Modify Bottom panel to be Left panel
new_bottom_panel = []
for line in bottom_panel:
    if 'Bottom Panel of Composer' in line:
        line = line.replace('Bottom Panel of Composer: Scrolling Tables', 'Left Panel of Composer: Scrolling Tables')
    new_bottom_panel.append(line)

with open('src/App.jsx', 'w') as f:
    f.writelines(pre)
    f.write(wrapper)
    f.writelines(new_bottom_panel)
    f.writelines(new_top_panel)
    f.writelines(post)

print("SUCCESS")
