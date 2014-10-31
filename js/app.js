angular.module('myApp', ['ngRoute'])
    .controller('MainController', function ($scope, $timeout, Weather, UserService) {
        // Build the date object
        $scope.user = UserService.user;

        $scope.date = {};

        var updateTime = function () {
            $scope.date.tz = new Date(new Date().toLocaleString("en-US", { timeZone: $scope.user.timezone }));
            $timeout(updateTime, 1000);
        }
        // Kick off the update function
        updateTime();


        $scope.weather = {};
        Weather.getWeatherForecast($scope.user.location).then(function (data) {
            $scope.weather.forecast = data;
        });
    })
    .provider('Weather', function () {
        var apiKey = "";
        this.setApiKey = function (key) {
            if (key) this.apiKey = key;
        }

        this.getUrl = function (type, ext) {
            return "https://api.wunderground.com/api/" + this.apiKey + "/" + type + "/q/" + ext + '.json?callback=JSON_CALLBACK';
        }
        this.getAutocompleteUrl = function () {
            return "https://autocomplete.wunderground.com/aq?";
        }

        this.$get = function ($q, $http) {
            var self = this;
            return {
                getWeatherForecast: function (city) {
                    var d = $q.defer();
                    $http.jsonp(self.getUrl('forecast', city)).success(function (data) {
                        d.resolve(data.forecast.simpleforecast);
                    }).error(function (err) {
                        d.reject(err);
                    });
                    return d.promise;
                },
                getCityDetails: function (query) {
                    var d = $q.defer();
                    $http({
                        method: "JSONP",
                        params: {
                            cb: "JSON_CALLBACK"
                        },
                        url: self.getAutocompleteUrl() + "query=" + query

                    }).success(function (data) {
                        d.resolve(data.RESULTS);
                    }).error(function (err) {
                        d.reject(err);
                    });
                    return d.promise;
                }
            }
        }
    })
    .config(function (WeatherProvider) {
		//When you install this package to chrome, please replace <<Wunderground Key ID>> with 
		//the Key ID you get from http://www.wunderground.com after your registration.
        WeatherProvider.setApiKey('<<Wunderground Key ID>>');
    })
    .config(function ($routeProvider) {
        $routeProvider.when('/', {
            templateUrl: 'templates/home.html',
            controller: 'MainController'
        })
            .when('/settings', {
                templateUrl: 'templates/settings.html',
                controller: 'SettingsController'
            })
            .otherwise({ redirectTo: '/' });
    })
    .factory('UserService', function () {
        var defaults = { location: '10001.5.99999', timezone: 'America/New_York', name: "New York City, New York" };
        var service = {
            user: {},
            save: function () {
                sessionStorage.presently = angular.toJson(service.user);
            },
            restore: function () {
                service.user = angular.fromJson(sessionStorage.presently) || defaults;
                return service.user;
            }
        };

        service.restore();
        return service;
    })
    .controller('SettingsController',
        function ($scope, UserService, Weather) {
            $scope.user = UserService.user;
            $scope.save = function () {
                UserService.save();
            }

            $scope.fetchCities = Weather.getCityDetails;
        })
    .directive('autoFill', function ($timeout) {
        return {
            restrict: 'EA',
            scope: {
                autoFill: '&',
                location: '=',
                timezone: '=',
                reslist: '='
            },
            compile: function (tEle, tAttrs) {
                var tplEl = angular.element('<div class="typeahead">' +
                    '<input type="text" ng-model="user.name" location="user.location" autocomplete="off"/>' +
                    '<ul id="autolist"  ng-show="reslist">' +
                    '<li ng-repeat="res in reslist">{{res.name}}</li>' +
                    '</ul>' +
                    '</div>');
                var input = tplEl.find('input');
                input.attr('type', tAttrs.type);
                input.attr('location', tAttrs.location);
                input.attr('ng-model', tAttrs.ngModel);
                input.attr('timezone', tAttrs.timezone);

                tEle.replaceWith(tplEl);

                return function (scope, ele, attrs, ctrl) {
                    var minKeyCount = attrs.minKeyCount || 3,
                        timer,
                        input = ele.find('input');
                    input.bind('keyup', function (e) {
                        val = ele.val();
                        if (val.length < minKeyCount) {
                            if (timer) $timeout.cancel(timer);
                            scope.reslist = null;
                            return;
                        } else {
                            if (timer) $timeout.cancel(timer);
                            timer = $timeout(function () {
                                scope.autoFill()(val)
                                    .then(function (data) {

                                        if (data && data.length > 0) {
                                            scope.reslist = data;
                                            scope.location = data[0].zmw;
                                            scope.timezone = data[0].tz;
                                        }
                                    });
                            }, 300);
                        }
                    });
                    // Hide the reslist on blur
                    input.bind('blur', function (e) {
                        scope.reslist = null;
                        scope.$digest();
                    });
                }
            }
        }
    });



