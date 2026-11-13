package com.sprintpay.absence.security;

import com.sprintpay.absence.model.Employe;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenService {

    private final Map<String, Employe> activeTokens = new ConcurrentHashMap<>();

    public String createToken(Employe employe) {
        String token = UUID.randomUUID().toString();
        activeTokens.put(token, employe);
        return token;
    }

    public Employe getEmployeByToken(String token) {
        return activeTokens.get(token);
    }

    public void revokeToken(String token) {
        if (token != null) {
            activeTokens.remove(token);
        }
    }
}

