package com.sprintpay.absence.controller;

import com.sprintpay.absence.model.Employe;
import com.sprintpay.absence.repository.EmployeRepository;
import com.sprintpay.absence.security.TokenService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final EmployeRepository employeRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthController(EmployeRepository employeRepository,
                          PasswordEncoder passwordEncoder,
                          TokenService tokenService) {
        this.employeRepository = employeRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    // Création de compte (Inscription)
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String motDePasse = payload.get("motDePasse");
        String nom = payload.get("nom");
        String prenom = payload.get("prenom");
        String poste = payload.getOrDefault("poste", "Collaborateur");
        String departement = payload.getOrDefault("departement", "Technologie");
        String role = payload.getOrDefault("role", "EMPLOYE");

        if (email == null || email.isBlank() || motDePasse == null || motDePasse.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email et mot de passe sont obligatoires."));
        }

        if (employeRepository.existsByEmail(email.trim().toLowerCase())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Cet email est déjà utilisé par un autre compte."));
        }

        Employe nouvelEmploye = new Employe(
                nom,
                prenom,
                email.trim().toLowerCase(),
                passwordEncoder.encode(motDePasse),
                poste,
                departement,
                role
        );

        Employe saved = employeRepository.save(nouvelEmploye);
        String token = tokenService.createToken(saved);

        return ResponseEntity.ok(Map.of(
                "token", token,
                "user", saved
        ));
    }

    // Connexion (Login)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String motDePasse = payload.get("motDePasse");

        if (email == null || motDePasse == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Veuillez renseigner votre email et mot de passe."));
        }

        Employe employe = employeRepository.findByEmail(email.trim().toLowerCase()).orElse(null);
        if (employe == null || !passwordEncoder.matches(motDePasse, employe.getMotDePasse())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Email ou mot de passe incorrect."));
        }

        String token = tokenService.createToken(employe);
        return ResponseEntity.ok(Map.of(
                "token", token,
                "user", employe
        ));
    }

    // Déconnexion (Logout)
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            tokenService.revokeToken(authHeader.substring(7));
        }
        return ResponseEntity.ok(Map.of("message", "Déconnexion réussie."));
    }
}

