# Profile Pair Image Generator

This is the tiny Vercel image endpoint for YAGPDB commands that need two Discord profile pictures edited into one image.

## What it does

It creates a PNG from two Discord avatar URLs:

```text
https://your-vercel-site.vercel.app/api/pair?left=AVATAR_URL&right=AVATAR_URL&leftName=Alice&rightName=Bob&theme=mystery
```

The result is a simple image with two avatars and a narrow middle strip. You can use different themes:

```text
theme=mystery
theme=ship
theme=duel
```

The shipping theme shows the percentage you send to the image generator:

```text
&theme=ship&percent=69
```

`/api/hangry` still works too, but `/api/pair` is the better name for your commands.

## Deploy on Vercel

1. Put this `profile-pair-image-generator` folder in a GitHub repository.
2. In Vercel, click **Add New...** then **Project**.
3. Import the GitHub repository.
4. For **Root Directory**, choose `profile-pair-image-generator` if your repo has other files too.
5. Click **Deploy**.
6. Copy your Vercel URL, like:

```text
https://your-project-name.vercel.app
```

## Test URL

After deploying, paste this in your browser with real Discord avatar links:

```text
https://your-project-name.vercel.app/api/pair?left=https%3A%2F%2Fcdn.discordapp.com%2Fembed%2Favatars%2F0.png&right=https%3A%2F%2Fcdn.discordapp.com%2Fembed%2Favatars%2F1.png&leftName=Alice&rightName=Bob&theme=mystery
```

Shipping test:

```text
https://your-project-name.vercel.app/api/pair?left=https%3A%2F%2Fcdn.discordapp.com%2Fembed%2Favatars%2F0.png&right=https%3A%2F%2Fcdn.discordapp.com%2Fembed%2Favatars%2F1.png&leftName=Alice&rightName=Bob&theme=ship&percent=69
```

## YAGPDB Murder Mystery Image Command

Create a command trigger named `mysterypair`, then paste this:

```gotemplate
{{/* Usage: -mysterypair @user1 @user2 */}}

{{$args := parseArgs 2 "Usage: `-mysterypair @suspect @victim`"
  (carg "user" "suspect")
  (carg "user" "victim")
}}

{{$u1 := $args.Get 0}}
{{$u2 := $args.Get 1}}

{{$base := "https://your-project-name.vercel.app"}}
{{$avatar1 := $u1.AvatarURL "512"}}
{{$avatar2 := $u2.AvatarURL "512"}}

{{$image := print $base "/api/pair?left=" (urlquery $avatar1) "&right=" (urlquery $avatar2) "&leftName=" (urlquery $u1.Username) "&rightName=" (urlquery $u2.Username) "&theme=mystery"}}

{{sendMessage nil (cembed
  "title" "Murder Mystery"
  "description" (print "**" $u1.Username "** vs **" $u2.Username "**")
  "color" 1638258
  "image" (sdict "url" $image)
)}}
```

Replace `https://your-project-name.vercel.app` with your real Vercel URL.

## YAGPDB Shipping Image Command

Create a command trigger named `ship`, then paste this:

```gotemplate
{{/* Usage: -ship @user1 @user2 */}}

{{$args := parseArgs 2 "Usage: `-ship @user1 @user2`"
  (carg "user" "person 1")
  (carg "user" "person 2")
}}

{{$u1 := $args.Get 0}}
{{$u2 := $args.Get 1}}

{{$base := "https://your-project-name.vercel.app"}}
{{$avatar1 := $u1.AvatarURL "512"}}
{{$avatar2 := $u2.AvatarURL "512"}}
{{$percent := randInt 0 111}}
{{$image := print $base "/api/pair?left=" (urlquery $avatar1) "&right=" (urlquery $avatar2) "&leftName=" (urlquery $u1.Username) "&rightName=" (urlquery $u2.Username) "&theme=ship&percent=" $percent "&v=" currentTime.UnixNano}}

{{sendMessage nil (cembed
  "title" "Ship Check"
  "description" (print "**" $u1.Username "** + **" $u2.Username "** = **" $percent "%**")
  "color" 16732067
  "image" (sdict "url" $image)
)}}
```
