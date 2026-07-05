@AGENTS.md

<!-- fleet-change-protocol -->
## Fleet change protocol (announce live-host changes — and close your own window)
This repo runs on the HitDirector fleet, which has a self-healing NOC that auto-remediates outages.
**Before you deploy, restart a service, run a migration, or do anything on a LIVE fleet host**, bracket
it so the NOC treats the blip as expected (otherwise you risk a false page or the responder fighting
your change):

```
fleet change start --host <host> --what "<what you're doing>"   # -> prints a change id
fleet change done <id>                                          # <- YOU must close it when finished
fleet change list                                               # show active windows
```

**Close your own window.** The agent that made the change is responsible for running `fleet change done`
as soon as the change is complete — don't rely on auto-expiry (that's only a crash safety net). After
you close it the NOC waits a ~3 min settle before re-arming that host, so a service still warming up
right after the change doesn't trip the responder. Hosts: web1 web2 monitor fasttax weightlossplus
backup1 conductor soc. Suppression is per-host and shows on monitor.hitdirector.com/warroom. Full
detail: `/opt/fleet/docs/CHANGE-PROTOCOL.md`. Local dev that never touches a running host doesn't need this.
