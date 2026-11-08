# shoplist

x86  
`podman build -t pocketbase . -f pocketbase`

arm64
`podman build -t pocketbase . -f pocketbase_arm64`


Rename your `.env.dev` to `.env` and update the variables for your name and url

```
podman run -d -p 8080:8080 \
    -v ./pb_data:/pb/pb_data:Z \
    -v ./pb_hooks:/pb/pb_hooks:Z \
    -v ./pb_public:/pb/pb_public:Z \
    --env-file .env \
    --name pb \
    pocketbase
```

The `:Z` suffix relabels the bind mounts for SELinux. Without it Podman
containers on SELinux hosts fail at startup with:

```
panic: registerHooks: open /pb/pb_hooks: permission denied
```

Use `:z` instead of `:Z` if the same directories are shared by multiple
containers.


Caddy config

```  
list.yourdomain.com {
        request_body {
        max_size 10MB
    }
        reverse_proxy http://127.0.0.1:8080
        import boilerplate
        tls your@email.com
}
```
