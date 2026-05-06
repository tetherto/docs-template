# Worked examples

Before-and-after rewrites for the most common defects in our docs. Use these as patterns when rewriting.

The examples use Pear-runtime terminology (`pear`, Hypercore, Hyperbee) because this skill ships from `tetherto/docs-template`, which was first used for Pear docs. The principles apply to any project; substitute your own product, command, and brand names when applying the patterns.

## Active voice and imperative

**Before** (passive, indirect):
> The configuration file should be loaded by the application before any requests are handled.

**After** (active, present):
> The application loads the configuration file before handling any requests.

**Before** (instruction in passive / future tense):
> The `pear init` command should be run by the user, after which a new project will be created.

**After** (imperative, present):
> Run `pear init`. This creates a new project.

## Cut filler

**Before:**
> It's easy to deploy your app — simply run the deploy script and you're done. Obviously, you should make sure your environment variables are set first.

**After:**
> To deploy your app, set the required environment variables, then run `pear deploy`.

The "easy", "simply", "obviously", and the second-person scolding all go.

## Ambiguous pronouns

**Before:**
> The cache flushes when the queue is empty. This is configurable.

**After:**
> The cache flushes when the queue is empty. The flush threshold is configurable.

"This" could refer to the flush, the queue, or the relationship. Replace with the actual noun.

## Long sentence with two ideas

**Before** (38 words, two ideas):
> When a node receives a block over the wire it validates the signature against the known peer set, and if validation succeeds it appends the block to the local feed and notifies any subscribed listeners that new data is available.

**After** (two sentences, one idea each):
> When a node receives a block, it validates the signature against the known peer set. If validation succeeds, the node appends the block to the local feed and notifies subscribed listeners.

## Heading case

**Before:**
> ## Configuring The Application For Production Use

**After:**
> ## Configure the application for production

Sentence case, imperative, no filler ("for use").

## Lists from prose

**Before:**
> The `pear run` command accepts a key, optionally a path to a manifest, optionally one or more environment overrides, and an optional debug flag.

**After:**
> The `pear run` command accepts:
>
> - A key (required).
> - A path to a manifest (optional).
> - One or more environment overrides (optional).
> - A `--debug` flag (optional).

## Parallel list structure

**Before** (mixed grammatical structure):
> - Run the install script.
> - You should then configure the env vars.
> - Restarting the service.

**After** (all imperative):
> - Run the install script.
> - Configure the environment variables.
> - Restart the service.

## "User" → "you"

**Before:**
> The user must authenticate before the user can access the API.

**After:**
> Authenticate before you can access the API.

Or, in reference voice:
> The API requires authentication.

## Plain words

**Before:**
> This functionality leverages the underlying replication mechanism to facilitate real-time updates.

**After:**
> This feature uses replication to deliver real-time updates.

## Defining an acronym on first use

**Before:**
> Configure the CDN to point at your static export.

**After (first use on the page):**
> Configure your content delivery network (CDN) to point at your static export.

Subsequent uses on the same page can use "CDN" alone.

## Link text

**Before:**
> For more information [click here](/explanation/replication).

**After:**
> See [how replication works](/explanation/replication).

## Quoting error messages

**Before:**
> If you see an error about the manifest, check the file path.

**After:**
> If you see `Error: manifest not found at <path>`, check the file path is correct.

## Inclusive language

**Before:**
> Add the IP to the whitelist; the master node will sync to the slaves.

**After:**
> Add the IP to the allowlist; the primary node syncs to the replicas.
