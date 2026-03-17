from bs4 import BeautifulSoup
import json

with open('full_php_all.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

table = soup.find('table', class_='tablesorter')
if table:
    headers = [th.text.strip() for th in table.find_all('th')]
    print("HEADERS:", headers)
    
    # get a few rows
    for r in table.find('tbody').find_all('tr')[:5]:
        cols = r.find_all('td')
        a_tag = cols[0].find('a')
        game_id = a_tag['href'].split('id=')[1] if a_tag and '?id=' in a_tag['href'] else None
        print("ROW:", [td.text.strip() for td in cols], "ID:", game_id)
