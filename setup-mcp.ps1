# QuestAI MCP Setup Script
# Run this AFTER closing Claude Desktop, BEFORE reopening it

$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"

# Read existing config
$existing = Get-Content $configPath -Raw | ConvertFrom-Json

# Add mcpServers key
$mcpServers = @{
    questai = @{
        command = "node"
        args    = @("C:\Users\DYSaiDeepak\Desktop\Questprep1\Questprep1\mcp-server.js")
        env     = @{
            QUESTAI_URL = "http://localhost:3000"
            MCP_SECRET  = "questai-mcp-2025"
        }
    }
}

# Merge: add mcpServers to existing config
$existing | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue $mcpServers -Force

# Write back
$existing | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding utf8

Write-Host ""
Write-Host "SUCCESS: MCP config written to $configPath" -ForegroundColor Green
Write-Host ""
Write-Host "Now start Claude Desktop. The 'questai' MCP server will load on startup." -ForegroundColor Cyan
Write-Host ""
Write-Host "To verify: open a new chat in Claude Desktop and type:" -ForegroundColor Yellow
Write-Host "  list_tracks" -ForegroundColor White
