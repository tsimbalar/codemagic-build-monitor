![Main](https://github.com/tsimbalar/codemagic-build-monitor/workflows/Main/badge.svg?event=push)

# codemagic-build-monitor

Adapter to give access to CodeMagic build status via the [CatLight Protocol](https://github.com/catlightio/catlight-protocol)

<img src="./assets/03-monitor-builds.png" title="builds" width="60%">

## How To

To use `codemagic-build-monitor` to monitor your CodeMagic workflows, follow these steps :

### 1. Start the "proxy" locally

```
docker run --name codemagic-build-monitor -d -p 9902:9902 --restart unless-stopped ghcr.io/tsimbalar/codemagic-build-monitor
```

Open `http://localhost:9902/` in a browser to check that the server is up and running.

### 2. Get your Access Token
- Go to your CodeMagic user settings at https://codemagic.io/settings
- Look for your CodeMagic API token

<img src="./assets/00-codemagic-token.png" title="connect" width="60%">


### 3. Connecting Catlight to `codemagic-build-monitor`

In CatLight, you need to :

1. Add new connection
2. choose "CatLight-compatible"
3. Log in with :

- Url : `http://localhost:9902/builds`
- "Use token"
- paste your token

4. Connect

<img src="./assets/01-add-connection.png" title="connect" width="60%">

### 4. Choose the workflows you want to track

1. Select the workflows you want to monitor
2. Connect

<img src="./assets/02-select-workflows.png" title="select workflows" width="60%">

### 5. Profit

Get notified about new builds, failing builds etc

<img src="./assets/03-monitor-builds.png" title="builds" width="60%">

---

## Roadmap
