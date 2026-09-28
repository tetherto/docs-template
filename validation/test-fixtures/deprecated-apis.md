# Test: Deprecated API Usage

This file contains deprecated API references that should be caught.

## Old Function Names

Use `connectThing()` to connect to the device.

Call `collectThingSnap()` to get the current state.

The worker is started with `startWorker()` instead of the new pattern.

## Old Class Names

Configure your `WM_M56S` miner settings.

The `AM_S19XP` supports new power modes.

Set up the `AV_A1346` in the config file.

## Old Patterns

```javascript
const worker = new Worker();
worker.start();  // Worker.start() is deprecated
```

## Good Examples (should not trigger)

Use `bootWorker()` to initialize workers.

Call the new `connectDevice()` API.

Modern worker classes use proper names like `WhatsminerWorker`.
