import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

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
    try {
      const cwd = workingDirectory || process.cwd();
      const { stdout, stderr } = await execAsync(`powershell.exe -Command "${command.replace(/"/g, '""')}"`, { 
        cwd,
        timeout: 30000 // 30 second timeout
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
    try {
      const cwd = workingDirectory || process.cwd();
      const { stdout, stderr } = await execAsync(`cmd.exe /c "${command}"`, { 
        cwd,
        timeout: 30000 // 30 second timeout
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
    try {
      const cwd = workingDirectory || process.cwd();
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
        timeout: 30000,
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