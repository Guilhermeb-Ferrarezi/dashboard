import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI?.trim();

function extractMongoHost(uri) {
  return uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^:/?,]+)/u)?.[1] ?? null;
}

function isLocalMongoHost(host) {
  if (!host) {
    return false;
  }

  if (["localhost", "127.0.0.1", "::1"].includes(host)) {
    return true;
  }

  return !host.includes(".");
}

if (!mongoUri) {
  console.error("MONGO_URI nao configurada no arquivo .env");
  process.exit(1);
}

const mongoHost = extractMongoHost(mongoUri);

if (!isLocalMongoHost(mongoHost)) {
  console.log(`Mongo remoto detectado em ${mongoHost}. Pulando bootstrap local via Docker.`);
  process.exit(0);
}

const match = mongoUri.match(
  /^mongodb:\/\/([^:]+):([^@]+)@([^:/?]+)(?::(\d+))?(\/[^?]*)?(?:\?(.*))?$/u,
);

if (!match) {
  console.error("O script mongo:dev suporta apenas URIs mongodb://usuario:senha@host:porta");
  process.exit(1);
}

const [, rawUsername, rawPassword, , rawPort] = match;
const username = decodeURIComponent(rawUsername);
const password = decodeURIComponent(rawPassword);
const port = rawPort || "27017";
const containerName = process.env.MONGO_CONTAINER_NAME?.trim() || "home-mongo-dev";
const image = process.env.MONGO_IMAGE?.trim() || "mongo:7";
const volumeName = `${containerName}-data`;

function runDocker(args, options = {}) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
}

function ensureDockerAvailable() {
  const result = runDocker(["version", "--format", "{{.Server.Version}}"]);

  if (result.status !== 0) {
    console.error(
      [
        "Docker nao esta disponivel. O script `bun run dev` precisa de um Mongo local para evitar a falha de conexao do Bun.",
        "Inicie o Docker ou aponte `MONGO_URI` para um Mongo acessivel neste ambiente.",
      ].join("\n"),
    );
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
    process.exit(1);
  }
}

async function waitForMongo() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const probe = runDocker([
      "exec",
      containerName,
      "mongosh",
      "--quiet",
      "-u",
      username,
      "-p",
      password,
      "--authenticationDatabase",
      "admin",
      "--eval",
      "db.adminCommand({ ping: 1 })",
    ]);

    if (probe.status === 0 && /\bok\s*:\s*1\b/u.test(probe.stdout)) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  console.error("Mongo iniciou, mas nao respondeu ao ping dentro do tempo esperado.");
  process.exit(1);
}

ensureDockerAvailable();

const inspect = runDocker(["inspect", "-f", "{{.State.Running}}", containerName]);

if (inspect.status === 0) {
  if (inspect.stdout.trim() !== "true") {
    const start = runDocker(["start", containerName]);

    if (start.status !== 0) {
      console.error("Nao foi possivel iniciar o container Mongo existente.");
      if (start.stderr) {
        console.error(start.stderr.trim());
      }
      process.exit(1);
    }
  }
} else {
  runDocker(["volume", "create", volumeName]);

  const create = runDocker([
    "run",
    "-d",
    "--name",
    containerName,
    "-p",
    `${port}:27017`,
    "-v",
    `${volumeName}:/data/db`,
    "-e",
    `MONGO_INITDB_ROOT_USERNAME=${username}`,
    "-e",
    `MONGO_INITDB_ROOT_PASSWORD=${password}`,
    image,
  ]);

  if (create.status !== 0) {
    console.error("Nao foi possivel criar o container Mongo local.");
    if (create.stderr) {
      console.error(create.stderr.trim());
    }
    process.exit(1);
  }
}

await waitForMongo();

console.log(`Mongo local pronto em localhost:${port} (container: ${containerName})`);
