set :stage, :production

set :deploy_to, '/var/www/sightwind.com'

role :app, %w{ubuntu@dev1.ometfn.net}
role :web, %w{ubuntu@dev1.ometfn.net}

server 'dev1.ometfn.net', user: 'ubuntu', roles: %w{web app}, my_property: :my_value, port: 22001

