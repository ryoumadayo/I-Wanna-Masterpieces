import re

content = open('games.js', encoding='utf-8').read()
ids_in_js = set(int(x) for x in re.findall(r'"id": (\d+)', content))
tool_ids = {21558, 23606, 12455, 15691, 16235, 17605, 15692, 16202, 16383, 20686, 19576, 18844}
found = tool_ids & ids_in_js
print("Tool IDs still in games.js:", found if found else "None - all clean!")
print("Total entries in games.js:", len(ids_in_js))
