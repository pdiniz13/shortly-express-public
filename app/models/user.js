var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  initialize: function(){
    this.on('creating', function(model, attribute, options){
      var salt = bcrypt.genSaltSync(50);
      var hash = bcrypt.hashSync(model.get('password'), salt);
      model.set('salt', salt);
      model.set('password', hash);
      //model.set('username', model.get('username'))
    });
  },
  links: function() {
    return this.hasMany(Link);
  },
});

module.exports = User;
