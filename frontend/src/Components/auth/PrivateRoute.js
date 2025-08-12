import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth'; // <-- On l'importe ici

function PrivateRoute({ requiredRole }) {
    const { user } = useAuth();
    
    console.log('PrivateRoute - Vérification accès:', user ? `Utilisateur connecté: ${user.username} (${user.role})` : 'Non connecté');
    
    // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
    if (!user) {
        console.log('PrivateRoute - Accès refusé: utilisateur non connecté');
        return <Navigate to="/login" />;
    }

    // Si un rôle spécifique est requis et que l'utilisateur n'a pas ce rôle, rediriger
    if (requiredRole && user.role !== requiredRole) {
        console.log(`PrivateRoute - Accès refusé: rôle requis ${requiredRole}, rôle actuel ${user.role}`);
        return <Navigate to="/" />;
    }
    
    console.log('PrivateRoute - Accès autorisé');
    return <Outlet />;
}

export default PrivateRoute;