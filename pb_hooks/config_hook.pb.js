routerAdd("GET", "/api/_/config", (e) => {
    // adding some container variables for front end access
    return e.json(200, {
        siteTitle: $os.getenv("SITE_TITLE"),
        appUrl: $os.getenv("APP_URL"),
        version: $os.getenv("VERSION"),
    })
})

// testing a new path/hook
routerAdd("GET", "/hello/{name}", (e) => {
    let name = e.request.pathValue("name")
    return e.json(200, { "message": "Hello " + name })
})
