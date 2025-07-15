# CLI MCP Server

Un server MCP (Model Context Protocol) che supporta l'esecuzione di comandi da terminale sia su PowerShell che CMD.

## Funzionalità

### Strumenti Disponibili

1. **add** - Somma due numeri
2. **powershell** - Esegue comandi PowerShell
3. **cmd** - Esegue comandi CMD
4. **shell** - Esegue comandi shell (auto-rileva il sistema operativo)
5. **system-info** - Mostra informazioni sul sistema

### Strumento PowerShell

Esegue comandi PowerShell specifici.

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

Esegue comandi CMD specifici.

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

Esegue comandi shell con rilevamento automatico del sistema operativo.

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

### Strumento System Info

Mostra informazioni sul sistema operativo e shell disponibili.

**Parametri:** Nessuno

## Sicurezza

- Tutti i comandi hanno un timeout di 30 secondi
- I comandi PowerShell vengono sanitizzati per evitare injection
- La directory di lavoro può essere specificata per ogni comando

## Utilizzo

1. Avvia il server:
```bash
node index.js
```

2. Il server si metterà in ascolto su stdin/stdout per comunicazioni MCP

## Requisiti

- Node.js v16 o superiore
- Windows (per PowerShell e CMD) o Linux/macOS (per bash)

## Installazione

```bash
npm install
```

## Dipendenze

- `@modelcontextprotocol/sdk`: SDK per server MCP
- `child_process`: Modulo built-in di Node.js per esecuzione comandi
- `os`: Modulo built-in di Node.js per informazioni sistema
