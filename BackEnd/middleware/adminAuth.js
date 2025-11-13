/**
 * Middleware para verificar se o usuário autenticado é administrador
 * Deve ser usado após authenticateToken
 */

function requireAdmin(req, res, next) {
  // Verifica se o usuário está autenticado (deve vir do authenticateToken)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autenticação necessária'
    });
  }

  // Verifica se o usuário é administrador
  // O userType vem do JWT token decodificado
  if (req.user.userType !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores podem acessar este recurso.'
    });
  }

  next();
}

module.exports = {
  requireAdmin
};

