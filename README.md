# ***REMOVED*** ***REMOVED*** 3rd Year Project 
##Grey Matter 
*An app to help improve quality of life for people living with memory impairment such as dementia or Alzheimer's disease*

There are 2 parts to the application, the server and the client application. Both require Node JS to be installed in order to be run on localhost.

Projects:

Server - bn3ypbackend
App - new_current

You can install npm from the official site: https://nodejs.org/en/

The client application is a cross-platform hybrid applicatoin made using Angular JS, Cordova and the Ionic Mobile framework.

For both projects, to install depenendencies simply open a command line in the directory of each project respectively and type the command:

'npm install'

This will download, configure and install all project dependencies.

To run the client app, ensure you have a copy of the server running first (this is live, but you can use localhost for better understanding and intercepting packets or debugging etc):

node server.js

Should start the server side project (bn3ypbackend)

Now the server can be accessed via localhost

To start that app:

Navigate to it's project folder, run command npm install

You may also need to install the ionic cli via

 npm install -g ionic

Then simply run ionic serve -l to see the app running in a browser

Or if on a Mac, you can simulate the app using the iOS simulator via:

ionic simulate ios

3rd party plugins used:

background geolocation plugin - 
https://github.com/transistorsoft/cordova-background-geolocation-lt

timepicker - 
https://github.com/rajeshwarpatlolla/ionic-timepicker

auth0 social login authentication - https://auth0.com/

Others have been used, but are a part of the Ionic frameworks dependencies so I will not state them explicitly (just see Ionic's documentation)

A guide to setting up Ionic can be found here:
http://ionicframework.com/docs/guide/installation.html
