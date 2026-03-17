import json
with open('games.json', 'r', encoding='utf-8') as f:
    games = json.load(f)
print(f"Total in games.json: {len(games)}")
print(f"Min num_ratings: {min(g.get('num_ratings', 0) for g in games)}")
counts = [g['num_ratings'] for g in games]
print(f"Games with 10-19 ratings: {len([c for c in counts if 10 <= c < 20])}")
