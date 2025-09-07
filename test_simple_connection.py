#!/usr/bin/env python
"""
Test de connexion simple pour diagnostiquer le problème
"""
import socket
import time

def test_connection():
    """Test de connexion TCP simple"""
    print("🔍 TEST CONNEXION SIMPLE")
    print("=" * 30)
    
    # Test port 8000 (backend)
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('localhost', 8000))
        sock.close()
        
        if result == 0:
            print("✅ Port 8000 (backend) accessible")
        else:
            print("❌ Port 8000 (backend) non accessible")
            
    except Exception as e:
        print(f"❌ Erreur test port 8000: {e}")
    
    # Test port 3000 (frontend)
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('localhost', 3000))
        sock.close()
        
        if result == 0:
            print("✅ Port 3000 (frontend) accessible")
        else:
            print("❌ Port 3000 (frontend) non accessible")
            
    except Exception as e:
        print(f"❌ Erreur test port 3000: {e}")
    
    # Test port 5432 (database)
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('localhost', 5432))
        sock.close()
        
        if result == 0:
            print("✅ Port 5432 (database) accessible")
        else:
            print("❌ Port 5432 (database) non accessible")
            
    except Exception as e:
        print(f"❌ Erreur test port 5432: {e}")

if __name__ == "__main__":
    test_connection()
