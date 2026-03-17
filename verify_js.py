import json
try:
    with open('games.js', 'r', encoding='utf-8') as f:
        js_text = f.read()
    json_str = js_text.split('const GAMES = ')[1].strip().rstrip(';')
    games = json.loads(json_str)
    print(f"Games in games.js: {len(games)}")
    if games:
        min_n = min(g['num_ratings'] for g in games)
        min_r = min(g['rating'] for g in games)
        print(f"Min num_ratings: {min_n}")
        print(f"Min rating: {min_r}")
        # Check for some IDs that might be tools/engines if known, 
        # but for now let's just see these stats.
except Exception as e:
    print(f"Error: {e}")
