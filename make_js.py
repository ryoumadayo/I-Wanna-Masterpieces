import json

with open('games.json', 'r', encoding='utf-8') as f:
    games = json.load(f)

# The list is already sorted by num_ratings descending.
# Keep only those with at least 20 ratings.
top_games = [g for g in games if g['num_ratings'] >= 10]

js_content = f"const GAMES = {json.dumps(top_games, ensure_ascii=False, indent=2)};\n"
with open('games.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Generated games.js with {len(top_games)} games.")
