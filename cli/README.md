# Rat Reader CLI

Terminal client for Rat Reader RSS.

## Installation

```bash
cd cli
pip install -r requirements.txt
```

Optionally, make it executable and add to your PATH:
```bash
chmod +x ratreader.py
ln -s $(pwd)/ratreader.py ~/.local/bin/ratreader
```

## Usage

First, configure your API URL:
```bash
./ratreader.py config https://yoursite.com/ratReader/api.php
```

Then log in:
```bash
./ratreader.py login
```

### Commands

| Command | Description |
|---------|-------------|
| `config <url>` | Set the API URL |
| `login` | Log in to your account |
| `logout` | Log out |
| `status` | Show login status |
| `feeds` | List your feeds |
| `add-feed <url>` | Add a new feed |
| `remove-feed <id>` | Remove a feed |
| `articles` | List latest articles |
| `read <n>` | Read article number n |

### Examples

```bash
# See your feeds
./ratreader.py feeds

# List articles with descriptions
./ratreader.py articles --verbose

# List articles with clickable links
./ratreader.py articles --links

# Show only 10 articles
./ratreader.py articles --limit 10

# Read article #3
./ratreader.py read 3

# Add a feed
./ratreader.py add-feed https://example.com/rss.xml

# Add a feed with custom name
./ratreader.py add-feed https://example.com/rss.xml -n "My Feed"
```

## Configuration

Config is stored in `~/.config/ratreader/config.json`
