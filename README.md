# CLI MCP Server

Un server MCP (Model Context Protocol) che supporta l'esecuzione di comandi da terminale sia su PowerShell che CMD, con funzionalità di sicurezza avanzate.

## Funzionalità

### Strumenti Disponibili

1. **add** - Somma due numeri
2. **powershell** - Esegue comandi PowerShell
3. **cmd** - Esegue comandi CMD
4. **shell** - Esegue comandi shell (auto-rileva il sistema operativo)
5. **system-info** - Mostra informazioni sul sistema
6. **security-config** - Mostra la configurazione di sicurezza corrente

## Configurazione di Sicurezza

Il server supporta un sistema di configurazione avanzato per limitare l'accesso e i comandi disponibili.

### File di Configurazione

Crea un file `config.json` nella directory root del progetto per personalizzare la configurazione:

```json
{
  "security": {
    "allowedPartitions": [
      "C:\\Users\\",
      "D:\\Projects\\",
      "E:\\Development\\"
    ],
    "blockedCommands": [
      "rm",
      "rmdir", 
      "del",
      "format",
      "fdisk",
      "diskpart",
      "shutdown",
      "reboot",
      "restart",
      "halt",
      "poweroff",
      "net user",
      "net localgroup",
      "adduser",
      "deluser",
      "passwd",
      "chpasswd",
      "sudo",
      "su",
      "runas",
      "reg delete",
      "reg add",
      "regedit",
      "gpedit",
      "sc delete",
      "sc create",
      "sc config",
      "taskkill",
      "wmic",
      "powercfg",
      "bcdedit"
    ],
    "allowedCommandPatterns": [
      "^(ls|dir|cd|pwd|echo|cat|type|find|grep|head|tail|sort|wc)\\b",
      "^(git|npm|node|python|pip)\\b",
      "^(Get-|Set-|New-|Remove-).*(Process|Service|Item|Content|Location)\\b"
    ],
    "maxCommandLength": 500,
    "timeoutSeconds": 30,
    "allowNetworkCommands": false
  }
}
```

### Opzioni di Configurazione

#### `allowedPartitions`
- Array di percorsi consentiti per l'esecuzione dei comandi
- Se vuoto, tutti i percorsi sono consentiti
- Esempio: `["C:\\Users\\", "D:\\Projects\\"]`

#### `blockedCommands`
- Array di comandi o parole chiave bloccati
- Controlla se il comando contiene queste parole
- Esempio: `["rm", "del", "format", "shutdown"]`

#### `allowedCommandPatterns`
- Array di pattern regex per comandi consentiti
- Se definito, solo i comandi che corrispondono ai pattern sono permessi
- Esempio: `["^(ls|dir|cd)\\b", "^git\\b"]`

#### `maxCommandLength`
- Lunghezza massima consentita per i comandi
- Default: 500 caratteri

#### `timeoutSeconds`
- Timeout per l'esecuzione dei comandi
- Default: 30 secondi

#### `allowNetworkCommands`
- Permette o blocca comandi di rete (curl, wget, ping, etc.)
- Default: false

## Esempi di Utilizzo

### Configurazione MCP Client

Per configurare un client MCP, usa questa configurazione:

```json
{
  "mcpServers": {
    "cli-mcp-server": {
      "command": "node",
      "args": ["path/to/cli-mcp/index.js"],
      "cwd": "path/to/cli-mcp",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Strumento PowerShell

Esegue comandi PowerShell specifici con controlli di sicurezza.

**Parametri:**

- `command` (obbligatorio): Comando PowerShell da eseguire
- `workingDirectory` (opzionale): Directory di lavoro per l'esecuzione

**Esempio:**

```json
{
  "command": "Get-Process | Select-Object -First 5",
  "workingDirectory": "C:\\Users"
}
```

### Strumento CMD

Esegue comandi CMD specifici con controlli di sicurezza.

**Parametri:**

- `command` (obbligatorio): Comando CMD da eseguire
- `workingDirectory` (opzionale): Directory di lavoro per l'esecuzione

**Esempio:**

```json
{
  "command": "dir /b",
  "workingDirectory": "C:\\Windows"
}
```

### Strumento Shell

Esegue comandi shell con rilevamento automatico del sistema operativo e controlli di sicurezza.

**Parametri:**

- `command` (obbligatorio): Comando shell da eseguire
- `workingDirectory` (opzionale): Directory di lavoro per l'esecuzione
- `shell` (opzionale): Shell specifico da usare ("auto", "powershell", "cmd", "bash")

**Esempio:**

```json
{
  "command": "ls -la",
  "shell": "bash"
}
```

### Strumento Security Config

Mostra la configurazione di sicurezza corrente del server.

**Parametri:** Nessuno

## Sicurezza

- Tutti i comandi hanno un timeout configurabile (default: 30 secondi)
- I comandi PowerShell vengono sanitizzati per evitare injection
- La directory di lavoro può essere specificata e viene controllata
- Sistema di blocco comandi basato su parole chiave
- Controllo accesso partizioni/directory
- Limite lunghezza comandi
- Pattern regex per comandi consentiti
- Blocco opzionale comandi di rete

## Utilizzo

1. Crea un file di configurazione `config.json` (opzionale)
2. Avvia il server:

```bash
node index.js
```

3. Il server si metterà in ascolto su stdin/stdout per comunicazioni MCP

## Installazione

```bash
npm install
```

## Configurazione di Esempio

Copia `config.example.json` in `config.json` e personalizza secondo le tue esigenze:

```bash
cp config.example.json config.json
```

## Requisiti

- Node.js v16 o superiore
- Windows (per PowerShell e CMD) o Linux/macOS (per bash)

## Dipendenze

- `@modelcontextprotocol/sdk`: SDK per server MCP
- `child_process`: Modulo built-in di Node.js per esecuzione comandi
- `os`: Modulo built-in di Node.js per informazioni sistema
- `path`: Modulo built-in di Node.js per gestione percorsi  
- `fs`: Modulo built-in di Node.js per accesso file system

## Messaggi di Sicurezza

Il server mostra messaggi chiari quando un comando viene bloccato:

- `❌ Command blocked: [motivo]` - Comando bloccato dalle regole di sicurezza
- `❌ Path access denied: [motivo]` - Accesso negato al percorso specificato
- `⚠️ No config.json found, using default configuration` - Configurazione predefinita in uso
- `✅ Configuration loaded from config.json` - Configurazione caricata correttamente
