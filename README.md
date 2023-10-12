Line of Thinking:
      Most auth flows these days use out of the box solutions such as OKTA, or similar, simply because
      it is more secure than anything one person, or a small team with limited knowledge can build.
      With that in mind I didn't go too over the top, as this is similar to the flow I built for one
      of my games, except that was built years ago, and only used SHA256 (shame shame!)
      I've put the app up on one of my servers and is running via PM2, so you're free to take some
      swings at it (http://52.14.82.102:3000/) I've listed some example calls below, and the redis
      "db" can be nuked at any time by hitting the "reset" API endpoint.
      I'm currentlly running it on 3000 because other ports on that server are occupied, or closed.
      the port number can be changed easily enough, it's a const in the top of index.js

How To:
      Just run node index.js to fire things up, not much to it.
      Usernames need to be alphanumaric between 3 and 16 characters
      Passwords must be at least 8 characters, contain one number, and one special character

NOTES - Chose Argon2 because of its simplicity to implement, implicit salting, and ability to configure
        by increasing both time and memory cost to match client needs, default settings used.
      - The VALUE is simply the argon2 hash (with metadata) example: 
        "$argon2id$v=19$m=65536,t=3,p=4$gKPj27D8Hiy+9bsHTEwOoQ$A0YMeOZxDLAhW/jdMoW5Mp//HyTjj9lsuTcJVN8H8lA"
      - The "value" field in the future could be changed to a json object to hold key informations 
        like account status, registration date, ext.
      - Each subsaquent failure to guess password results in a longer delay between attempts
      - A successful login will reset this delay, NOTE: delay currentlly is based on user IP,
        because of this, shared IPs may have trouble if they contain bad actors.


Example commands:

curl --location 'http://52.14.82.102:3000/api/register' \
--header 'Content-Type: application/json' \
--data '{
    "username": "ian42",
    "password": "testing22!"
}'
=== RESPONSE: {"success":false,"error":"Username Taken"}

curl --location 'http://52.14.82.102:3000/api/register' \
--header 'Content-Type: application/json' \
--data '{
    "username": "ian424",
    "password": "testing22"
}'
=== RESPONSE: {"success":false,"error":"Password must be at least 8 characters, and contain one number, and one special character"}

curl --location 'http://52.14.82.102:3000/api/login' \
--header 'Content-Type: application/json' \
--data '{
    "username": "ian4231",
    "password": "testing22!"
}'
=== RESPONSE: {"success":true,"message":"Login Success"}

curl --location 'http://52.14.82.102:3000/api/login' \
--header 'Content-Type: application/json' \
--data '{
    "username": "ian4231",
    "password": "testing2a2!"
}'
=== RESPONSE: {"success":false,"message":"Login Failed"}

curl --location --request POST 'http://52.14.82.102:3000/api/reset' \
--header 'Content-Type: application/json' \
--data ''
=== RESPONSE: {"success":true,"message":"Redis Cleared!"}