const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User, Role } = require('../models');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Buscar usuario por Google ID
        let user = await User.findOne({
          where: { google_id: profile.id },
          include: [{
            model: Role,
            as: 'roles',
            through: { attributes: [] }
          }]
        });

        if (!user) {
          // Buscar por email (para vincular cuentas existentes)
          user = await User.findOne({
            where: { email: profile.emails[0].value },
            include: [{
              model: Role,
              as: 'roles',
              through: { attributes: [] }
            }]
          });

          if (user) {
            // Vincular cuenta de Google a cuenta existente
            user.google_id = profile.id;
            user.auth_provider = 'google';
            user.profile_picture = profile.photos[0]?.value;
            await user.save();
          } else {
            // Crear nuevo usuario
            const username = profile.emails[0].value.split('@')[0] + '_' + Math.random().toString(36).substring(7);

            user = await User.create({
              username,
              email: profile.emails[0].value,
              google_id: profile.id,
              auth_provider: 'google',
              profile_picture: profile.photos[0]?.value,
              password: null
            });

            // Recargar con roles
            user = await User.findByPk(user.user_id, {
              include: [{
                model: Role,
                as: 'roles',
                through: { attributes: [] }
              }]
            });
          }
        } else {
          // Actualizar foto de perfil si cambió
          if (user.profile_picture !== profile.photos[0]?.value) {
            user.profile_picture = profile.photos[0]?.value;
            await user.save();
          }
        }

        // Retornar usuario
        return done(null, user);
      } catch (error) {
        console.error('Error en Google Strategy:', error);
        return done(error, null);
      }
    }
  )
);

// Serialización (si usas sesiones)
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id, {
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] }
      }]
    });
    done(null, user);
  } catch (error) {
    console.error('Error en deserializeUser:', error);
    done(error, null);
  }
});

module.exports = passport;
