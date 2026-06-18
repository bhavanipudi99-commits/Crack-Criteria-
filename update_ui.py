import sys

with open("src/App.jsx", "r") as f:
    content = f.read()

# We need to inject the Sub-chapter UI into the chapter loop.
# Target is around line 1727: "                                  {/* TABLES */}"
# We will replace the entire chapExpanded block.

target_start = """                              {chapExpanded && ("""
target_end = """                              )}"""

start_idx = content.find(target_start)

# find the matching closing brace for chapExpanded && (
balance = 0
end_idx = -1
for i in range(start_idx + len("                              {chapExpanded && ("), len(content)):
    if content[i] == '(':
        balance += 1
    elif content[i] == ')':
        if balance == 0:
            end_idx = i + 1
            break
        balance -= 1

original_block = content[start_idx:end_idx]

# We want to replace this block with one that first renders TABLES and CANVASES directly under the chapter,
# THEN renders a list of sub-chapters, each containing their own TABLES and CANVASES.

print("Found block length:", len(original_block))
