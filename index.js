import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

// Default security configuration
const DEFAULT_CONFIG = {
  security: {
    allowedPartitions: [], // Empty array means all partitions allowed
    defaultPath: process.cwd(), // Default working directory
    blockedCommands: [
      "rm", "rmdir", "del", "format", "fdisk", "diskpart",
      "shutdown", "reboot", "restart", "halt", "poweroff",
      "net user", "net localgroup", "adduser", "deluser",
      "passwd", "chpasswd", "sudo", "su", "runas",
      "reg delete", "reg add", "regedit", "gpedit",
      "sc delete", "sc create", "sc config",
      "taskkill", "wmic", "powercfg", "bcdedit"
    ],
    allowedCommandPatterns: [], // Regex patterns for allowed commands
    maxCommandLength: 500,
    timeoutSeconds: 30,
    allowNetworkCommands: false
  }
};

// Load configuration from config.json or use defaults
let config = DEFAULT_CONFIG;
try {
  const configPath = path.join(process.cwd(), 'config.json');
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf8');
    config = { ...DEFAULT_CONFIG, ...JSON.parse(configFile) };
    console.log('✅ Configuration loaded from config.json');
  } else {
    console.log('⚠️  No config.json found, using default configuration');
  }
} catch (error) {
  console.error('❌ Error loading configuration:', error.message);
  console.log('Using default configuration');
}

// Security validation functions
function isCommandAllowed(command) {
  // Check command length
  if (command.length > config.security.maxCommandLength) {
    return { allowed: false, reason: `Command exceeds maximum length of ${config.security.maxCommandLength} characters` };
  }

  // Check blocked commands
  const lowerCommand = command.toLowerCase();
  for (const blockedCmd of config.security.blockedCommands) {
    if (lowerCommand.includes(blockedCmd.toLowerCase())) {
      return { allowed: false, reason: `Command contains blocked keyword: ${blockedCmd}` };
    }
  }

  // Check network commands if disabled
  if (!config.security.allowNetworkCommands) {
    const networkCommands = ['curl', 'wget', 'ping', 'nslookup', 'telnet', 'ssh', 'ftp', 'scp', 'rsync'];
    for (const netCmd of networkCommands) {
      if (lowerCommand.includes(netCmd)) {
        return { allowed: false, reason: `Network command not allowed: ${netCmd}` };
      }
    }
  }

  // Check allowed command patterns (if any defined)
  if (config.security.allowedCommandPatterns.length > 0) {
    const allowed = config.security.allowedCommandPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(command);
    });
    if (!allowed) {
      return { allowed: false, reason: 'Command does not match any allowed patterns' };
    }
  }

  return { allowed: true };
}

function isPathAllowed(workingDirectory) {
  // Use default path if no working directory is specified
  const pathToCheck = workingDirectory || config.security.defaultPath;
  
  // Check allowed partitions
  if (config.security.allowedPartitions.length > 0) {
    const normalizedPath = path.normalize(pathToCheck).toLowerCase();
    const allowed = config.security.allowedPartitions.some(partition => {
      const normalizedPartition = path.normalize(partition).toLowerCase();
      return normalizedPath.startsWith(normalizedPartition);
    });
    
    if (!allowed) {
      return { 
        allowed: false, 
        reason: `Access to path '${pathToCheck}' is not allowed. Allowed partitions: ${config.security.allowedPartitions.join(', ')}` 
      };
    }
  }

  return { allowed: true };
}

// Create an MCP server
const server = new McpServer({
  name: "cli-mcp-server",
  version: "1.0.0"
});

// Add an addition tool
server.registerTool("add",
  {
    title: "Addition Tool",
    description: "Add two numbers",
    inputSchema: { a: z.number(), b: z.number() }
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

// Add PowerShell command execution tool
server.registerTool("powershell",
  {
    title: "PowerShell Command",
    description: "Execute a PowerShell command",
    inputSchema: { 
      command: z.string().describe("PowerShell command to execute"),
      workingDirectory: z.string().optional().describe("Working directory for command execution")
    }
  },
  async ({ command, workingDirectory }) => {
    // Security checks
    const commandCheck = isCommandAllowed(command);
    if (!commandCheck.allowed) {
      return {
        content: [{
          type: "text",
          text: `❌ Command blocked: ${commandCheck.reason}`
        }]
      };
    }

    const pathCheck = isPathAllowed(workingDirectory);
    if (!pathCheck.allowed) {
      return {
        content: [{
          type: "text",
          text: `❌ Path access denied: ${pathCheck.reason}`
        }]
      };
    }

    try {
      const cwd = workingDirectory || config.security.defaultPath;
      const { stdout, stderr } = await execAsync(`powershell.exe -Command "${command.replace(/"/g, '""')}"`, { 
        cwd,
        timeout: config.security.timeoutSeconds * 1000
      });
      
      let output = "";
      if (stdout) output += `Output:\n${stdout}`;
      if (stderr) output += `\nErrors:\n${stderr}`;
      
      return {
        content: [{
          type: "text",
          text: output || "Command executed successfully with no output"
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error executing PowerShell command: ${error.message}`
        }]
      };
    }
  }
);

// Add CMD command execution tool
server.registerTool("cmd",
  {
    title: "CMD Command",
    description: "Execute a CMD command",
    inputSchema: { 
      command: z.string().describe("CMD command to execute"),
      workingDirectory: z.string().optional().describe("Working directory for command execution")
    }
  },
  async ({ command, workingDirectory }) => {
    // Security checks
    const commandCheck = isCommandAllowed(command);
    if (!commandCheck.allowed) {
      return {
        content: [{
          type: "text",
          text: `❌ Command blocked: ${commandCheck.reason}`
        }]
      };
    }

    const pathCheck = isPathAllowed(workingDirectory);
    if (!pathCheck.allowed) {
      return {
        content: [{
          type: "text",
          text: `❌ Path access denied: ${pathCheck.reason}`
        }]
      };
    }

    try {
      const cwd = workingDirectory || config.security.defaultPath;
      const { stdout, stderr } = await execAsync(`cmd.exe /c "${command}"`, { 
        cwd,
        timeout: config.security.timeoutSeconds * 1000
      });
      
      let output = "";
      if (stdout) output += `Output:\n${stdout}`;
      if (stderr) output += `\nErrors:\n${stderr}`;
      
      return {
        content: [{
          type: "text",
          text: output || "Command executed successfully with no output"
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error executing CMD command: ${error.message}`
        }]
      };
    }
  }
);

// Add generic shell command execution tool (detects OS and uses appropriate shell)
server.registerTool("shell",
  {
    title: "Shell Command",
    description: "Execute a shell command (auto-detects PowerShell on Windows, bash on others)",
    inputSchema: { 
      command: z.string().describe("Shell command to execute"),
      workingDirectory: z.string().optional().describe("Working directory for command execution"),
      shell: z.enum(["auto", "powershell", "cmd", "bash"]).optional().describe("Specific shell to use")
    }
  },
  async ({ command, workingDirectory, shell = "auto" }) => {
    // Security checks
    const commandCheck = isCommandAllowed(command);
    if (!commandCheck.allowed) {
      return {
        content: [{
          type: "text",
          text: `❌ Command blocked: ${commandCheck.reason}`
        }]
      };
    }

    const pathCheck = isPathAllowed(workingDirectory);
    if (!pathCheck.allowed) {
      return {
        content: [{
          type: "text",
          text: `❌ Path access denied: ${pathCheck.reason}`
        }]
      };
    }

    try {
      const cwd = workingDirectory || config.security.defaultPath;
      let shellCommand;
      
      // Determine shell command based on OS and preference
      if (shell === "auto") {
        if (os.platform() === "win32") {
          shellCommand = `powershell.exe -Command "${command.replace(/"/g, '""')}"`;
        } else {
          shellCommand = command;
        }
      } else if (shell === "powershell") {
        shellCommand = `powershell.exe -Command "${command.replace(/"/g, '""')}"`;
      } else if (shell === "cmd") {
        shellCommand = `cmd.exe /c "${command}"`;
      } else {
        shellCommand = command;
      }
      
      const { stdout, stderr } = await execAsync(shellCommand, { 
        cwd,
        timeout: config.security.timeoutSeconds * 1000,
        shell: shell === "bash" ? "/bin/bash" : undefined
      });
      
      let output = "";
      if (stdout) output += `Output:\n${stdout}`;
      if (stderr) output += `\nErrors:\n${stderr}`;
      
      return {
        content: [{
          type: "text",
          text: output || "Command executed successfully with no output"
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error executing shell command: ${error.message}`
        }]
      };
    }
  }
);

// Add tool to get system information
server.registerTool("system-info",
  {
    title: "System Information",
    description: "Get system information including OS, platform, and available shells",
    inputSchema: {}
  },
  async () => {
    const platform = os.platform();
    const arch = os.arch();
    const release = os.release();
    const availableShells = [];
    
    if (platform === "win32") {
      availableShells.push("PowerShell", "CMD");
    } else {
      availableShells.push("Bash", "Shell");
    }
    
    return {
      content: [{
        type: "text",
        text: `System Information:
Platform: ${platform}
Architecture: ${arch}
Release: ${release}
Available Shells: ${availableShells.join(", ")}
Current Working Directory: ${process.cwd()}`
      }]
    };
  }
);

// Add tool to get security configuration
server.registerTool("security-config",
  {
    title: "Security Configuration",
    description: "Get current security configuration and restrictions",
    inputSchema: {}
  },
  async () => {
    return {
      content: [{
        type: "text",
        text: `Security Configuration:
        
🔒 Blocked Commands: ${config.security.blockedCommands.length > 0 ? config.security.blockedCommands.join(", ") : "None"}

📁 Allowed Partitions: ${config.security.allowedPartitions.length > 0 ? config.security.allowedPartitions.join(", ") : "All partitions allowed"}

🏠 Default Path: ${config.security.defaultPath}

📏 Max Command Length: ${config.security.maxCommandLength} characters

⏱️ Timeout: ${config.security.timeoutSeconds} seconds

🌐 Network Commands: ${config.security.allowNetworkCommands ? "Allowed" : "Blocked"}

✅ Allowed Command Patterns: ${config.security.allowedCommandPatterns.length > 0 ? config.security.allowedCommandPatterns.join(", ") : "None defined"}

📝 Config File: ${fs.existsSync(path.join(process.cwd(), 'config.json')) ? "config.json loaded" : "Using default configuration"}`
      }]
    };
  }
);

// Add a dynamic greeting resource
server.registerResource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  { 
    title: "Greeting Resource",      // Display name for UI
    description: "Dynamic greeting generator"
  },
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      text: `Hello, ${name}!`
    }]
  })
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);