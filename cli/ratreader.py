#!/usr/bin/env python3
"""
Rat Reader CLI - Terminal client for Rat Reader RSS
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    import requests
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.markdown import Markdown
    from rich.prompt import Prompt, Confirm
    from rich import print as rprint
except ImportError:
    print("Missing dependencies. Run: pip install requests rich")
    sys.exit(1)

# Config file location
CONFIG_DIR = Path.home() / ".config" / "ratreader"
CONFIG_FILE = CONFIG_DIR / "config.json"

console = Console()


def load_config():
    """Load configuration from file."""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}


def save_config(config):
    """Save configuration to file."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def get_api_url(config):
    """Get API URL from config or prompt user."""
    if "api_url" not in config:
        console.print("[yellow]No API URL configured.[/yellow]")
        url = Prompt.ask("Enter your Rat Reader API URL", 
                        default="https://yoursite.com/ratReader/api.php")
        config["api_url"] = url.rstrip("/")
        save_config(config)
    return config["api_url"]


def api_request(method, action, config, data=None, params=None):
    """Make an API request."""
    url = get_api_url(config)
    headers = {"Content-Type": "application/json"}
    
    if config.get("token"):
        headers["Authorization"] = f"Bearer {config['token']}"
    
    if params is None:
        params = {}
    params["action"] = action
    
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=30)
        elif method == "POST":
            resp = requests.post(url, headers=headers, params=params, 
                               json=data, timeout=30)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, params=params,
                                  json=data, timeout=30)
        else:
            raise ValueError(f"Unknown method: {method}")
        
        return resp.json()
    except requests.exceptions.ConnectionError:
        console.print("[red]Error: Could not connect to API[/red]")
        sys.exit(1)
    except requests.exceptions.Timeout:
        console.print("[red]Error: Request timed out[/red]")
        sys.exit(1)
    except json.JSONDecodeError:
        console.print("[red]Error: Invalid response from API[/red]")
        sys.exit(1)


def cmd_login(args, config):
    """Log in to Rat Reader."""
    username = args.username or Prompt.ask("Username")
    password = args.password or Prompt.ask("Password", password=True)
    
    result = api_request("POST", "login", config, {
        "username": username,
        "password": password
    })
    
    if result.get("error"):
        console.print(f"[red]Login failed: {result['error']}[/red]")
        return
    
    config["token"] = result.get("token")
    config["username"] = result.get("user", {}).get("username", username)
    save_config(config)
    console.print(f"[green]✓ Logged in as {config['username']}[/green]")


def cmd_logout(args, config):
    """Log out of Rat Reader."""
    if config.get("token"):
        api_request("POST", "logout", config)
    
    config.pop("token", None)
    config.pop("username", None)
    save_config(config)
    console.print("[green]✓ Logged out[/green]")


def cmd_status(args, config):
    """Show current login status."""
    if config.get("token"):
        console.print(f"[green]Logged in as: {config.get('username', 'unknown')}[/green]")
        console.print(f"API URL: {config.get('api_url', 'not set')}")
    else:
        console.print("[yellow]Not logged in[/yellow]")
        console.print(f"API URL: {config.get('api_url', 'not set')}")


def cmd_feeds(args, config):
    """List all feeds."""
    if not config.get("token"):
        console.print("[red]Please login first: ratreader login[/red]")
        return
    
    result = api_request("GET", "feeds", config)
    
    if result.get("error"):
        console.print(f"[red]Error: {result['error']}[/red]")
        return
    
    feeds = result.get("feeds", [])
    
    if not feeds:
        console.print("[yellow]No feeds yet. Add one with: ratreader add-feed <url>[/yellow]")
        return
    
    table = Table(title="📡 Your Feeds")
    table.add_column("ID", style="cyan", justify="right")
    table.add_column("Name", style="green")
    table.add_column("URL", style="dim")
    
    for feed in feeds:
        table.add_row(
            str(feed["id"]),
            feed["name"],
            feed["url"][:50] + "..." if len(feed["url"]) > 50 else feed["url"]
        )
    
    console.print(table)


def cmd_add_feed(args, config):
    """Add a new feed."""
    if not config.get("token"):
        console.print("[red]Please login first: ratreader login[/red]")
        return
    
    url = args.url
    name = args.name
    
    result = api_request("POST", "feeds", config, {
        "url": url,
        "name": name
    })
    
    if result.get("error"):
        console.print(f"[red]Error: {result['error']}[/red]")
        return
    
    console.print(f"[green]✓ Added feed: {result.get('feed', {}).get('name', url)}[/green]")


def cmd_remove_feed(args, config):
    """Remove a feed."""
    if not config.get("token"):
        console.print("[red]Please login first: ratreader login[/red]")
        return
    
    feed_id = args.feed_id
    
    if not args.yes:
        if not Confirm.ask(f"Remove feed {feed_id}?"):
            return
    
    result = api_request("DELETE", "feeds", config, {"feed_id": feed_id})
    
    if result.get("error"):
        console.print(f"[red]Error: {result['error']}[/red]")
        return
    
    console.print("[green]✓ Feed removed[/green]")


def cmd_articles(args, config):
    """List articles from feeds."""
    if not config.get("token"):
        console.print("[red]Please login first: ratreader login[/red]")
        return
    
    params = {}
    if args.feed_id:
        params["feed_id"] = args.feed_id
    
    result = api_request("GET", "live-articles", config, params=params)
    
    if result.get("error"):
        console.print(f"[red]Error: {result['error']}[/red]")
        return
    
    articles = result.get("articles", [])
    
    if not articles:
        console.print("[yellow]No articles found[/yellow]")
        return
    
    # Limit display
    limit = args.limit or 20
    articles = articles[:limit]
    
    for i, article in enumerate(articles, 1):
        # Parse date
        pub_date = article.get("pub_date", "")
        if pub_date:
            try:
                dt = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
                pub_date = dt.strftime("%Y-%m-%d %H:%M")
            except:
                pass
        
        feed_name = article.get("feed_name", "Unknown")
        title = article.get("title", "No title")
        link = article.get("link", "")
        
        # Display article
        console.print(f"\n[cyan]{i}.[/cyan] [bold]{title}[/bold]")
        console.print(f"   [dim]{feed_name} • {pub_date}[/dim]")
        
        if args.verbose and article.get("description"):
            # Strip HTML tags simply
            import re
            desc = re.sub(r'<[^>]+>', '', article.get("description", ""))
            desc = desc[:200] + "..." if len(desc) > 200 else desc
            console.print(f"   [white]{desc}[/white]")
        
        if args.links:
            console.print(f"   [blue underline]{link}[/blue underline]")
    
    console.print(f"\n[dim]Showing {len(articles)} articles[/dim]")


def cmd_read(args, config):
    """Read a specific article (show full content)."""
    if not config.get("token"):
        console.print("[red]Please login first: ratreader login[/red]")
        return
    
    # Fetch articles first
    result = api_request("GET", "live-articles", config)
    
    if result.get("error"):
        console.print(f"[red]Error: {result['error']}[/red]")
        return
    
    articles = result.get("articles", [])
    
    try:
        index = int(args.number) - 1
        if index < 0 or index >= len(articles):
            console.print(f"[red]Article {args.number} not found[/red]")
            return
        
        article = articles[index]
    except ValueError:
        console.print("[red]Please provide a valid article number[/red]")
        return
    
    # Display article
    title = article.get("title", "No title")
    feed_name = article.get("feed_name", "Unknown")
    pub_date = article.get("pub_date", "")
    link = article.get("link", "")
    
    console.print(Panel(f"[bold]{title}[/bold]\n\n[dim]{feed_name} • {pub_date}[/dim]"))
    
    # Show description/content
    import re
    content = article.get("description") or article.get("content") or "No content"
    content = re.sub(r'<[^>]+>', '', content)  # Strip HTML
    console.print(f"\n{content}\n")
    
    console.print(f"[blue underline]{link}[/blue underline]")


def cmd_config_url(args, config):
    """Set the API URL."""
    config["api_url"] = args.url.rstrip("/")
    save_config(config)
    console.print(f"[green]✓ API URL set to: {config['api_url']}[/green]")


def main():
    parser = argparse.ArgumentParser(
        description="🐀 Rat Reader CLI - Terminal RSS Reader",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Login
    login_parser = subparsers.add_parser("login", help="Log in to Rat Reader")
    login_parser.add_argument("-u", "--username", help="Username")
    login_parser.add_argument("-p", "--password", help="Password")
    
    # Logout
    subparsers.add_parser("logout", help="Log out")
    
    # Status
    subparsers.add_parser("status", help="Show login status")
    
    # Feeds
    subparsers.add_parser("feeds", help="List your feeds")
    
    # Add feed
    add_parser = subparsers.add_parser("add-feed", help="Add a new feed")
    add_parser.add_argument("url", help="Feed URL")
    add_parser.add_argument("-n", "--name", help="Feed name (optional)")
    
    # Remove feed
    rm_parser = subparsers.add_parser("remove-feed", help="Remove a feed")
    rm_parser.add_argument("feed_id", help="Feed ID to remove")
    rm_parser.add_argument("-y", "--yes", action="store_true", help="Skip confirmation")
    
    # Articles
    articles_parser = subparsers.add_parser("articles", help="List articles")
    articles_parser.add_argument("-f", "--feed-id", help="Filter by feed ID")
    articles_parser.add_argument("-l", "--limit", type=int, default=20, help="Max articles to show")
    articles_parser.add_argument("-v", "--verbose", action="store_true", help="Show descriptions")
    articles_parser.add_argument("--links", action="store_true", help="Show article links")
    
    # Read article
    read_parser = subparsers.add_parser("read", help="Read an article")
    read_parser.add_argument("number", help="Article number from list")
    
    # Config
    config_parser = subparsers.add_parser("config", help="Configure settings")
    config_parser.add_argument("url", help="API URL")
    
    args = parser.parse_args()
    config = load_config()
    
    if args.command == "login":
        cmd_login(args, config)
    elif args.command == "logout":
        cmd_logout(args, config)
    elif args.command == "status":
        cmd_status(args, config)
    elif args.command == "feeds":
        cmd_feeds(args, config)
    elif args.command == "add-feed":
        cmd_add_feed(args, config)
    elif args.command == "remove-feed":
        cmd_remove_feed(args, config)
    elif args.command == "articles":
        cmd_articles(args, config)
    elif args.command == "read":
        cmd_read(args, config)
    elif args.command == "config":
        cmd_config_url(args, config)
    else:
        parser.print_help()
        console.print("\n[dim]Examples:[/dim]")
        console.print("  ratreader config https://yoursite.com/ratReader/api.php")
        console.print("  ratreader login")
        console.print("  ratreader feeds")
        console.print("  ratreader articles --verbose")
        console.print("  ratreader read 1")


if __name__ == "__main__":
    main()
