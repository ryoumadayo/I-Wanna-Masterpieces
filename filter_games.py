import json
from bs4 import BeautifulSoup

def process():
    print("Loading HTML...")
    with open('full_php_all.html', 'r', encoding='utf-8') as f:
        html = f.read()

    print("Parsing HTML...")
    soup = BeautifulSoup(html, 'html.parser')
    table = soup.find('table', class_='tablesorter')
    if not table:
        print("No table found")
        return

    print("Extracting games...")
    games = []
    # headers expected: ['Game', 'Difficulty', 'Rating', '# of Ratings']
    for r in table.find('tbody').find_all('tr'):
        cols = r.find_all('td')
        if len(cols) >= 4:
            a_tag = cols[0].find('a')
            if not a_tag:
                continue
            game_name = a_tag.text.strip()
            # href is like /ratings/game_details.php?id=...
            game_id = a_tag['href'].split('id=')[1] if '?id=' in a_tag['href'] else None
            
            diff_text = cols[1].text.strip()
            rating_text = cols[2].text.strip()
            num_ratings_text = cols[3].text.strip()
            
            # Parse numbers
            try:
                numeric_id = int(game_id) if game_id else 0
            except ValueError:
                numeric_id = 0
                
            try:
                rating = float(rating_text)
            except ValueError:
                rating = 0.0
                
            try:
                num_ratings = int(num_ratings_text)
            except ValueError:
                num_ratings = 0
                
            try:
                difficulty_num = float(diff_text)
            except ValueError:
                difficulty_num = 0.0

            games.append({
                'id': numeric_id,
                'name': game_name,
                'difficulty': diff_text,
                'difficulty_num': difficulty_num,
                'rating': rating,
                'num_ratings': num_ratings
            })

    print(f"Total games parsed: {len(games)}")
    
    # Filter
    high_rating_games = [g for g in games if g['rating'] >= 6.0]
    print(f"Games with rating >= 6.0: {len(high_rating_games)}")

    # Many comments/ratings. Let's see what the threshold should be.
    # We will sort by num_ratings first to see.
    high_rating_games.sort(key=lambda x: x['num_ratings'], reverse=True)
    
    # We will keep all that have >= 6.0 rating, sorted by num_ratings,
    # and save to JSON.
    with open('games.json', 'w', encoding='utf-8') as f:
        json.dump(high_rating_games, f, indent=2, ensure_ascii=False)
    
    print("Saved games.json with top games")

if __name__ == '__main__':
    process()
