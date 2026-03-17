import urllib.request
from bs4 import BeautifulSoup

url = "https://delicious-fruit.com/ratings/advanced_search.php"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read()
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check inputs and selects to see what tags are named
        tag_container = soup.find('div', id='tags') or soup.find(text=lambda x: x and 'Tags' in x)
        print("Finding selects:")
        for select in soup.find_all('select'):
            print(select.get('name'))
            if 'tag' in str(select.get('name', '')):
                for option in select.find_all('option'):
                    print("  ", option['value'], option.text)
                    
        print("Finding checkboxes inside labels:")
        for label in soup.find_all('label'):
            print(label.text)
            
except Exception as e:
    print(f"Error: {e}")
