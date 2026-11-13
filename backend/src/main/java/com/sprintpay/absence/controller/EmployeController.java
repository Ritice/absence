package com.sprintpay.absence.controller;

import com.sprintpay.absence.model.Absence;
import com.sprintpay.absence.model.Employe;
import com.sprintpay.absence.repository.AbsenceRepository;
import com.sprintpay.absence.repository.EmployeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employes")
@CrossOrigin(origins = "*")
public class EmployeController {

    private final EmployeRepository employeRepository;
    private final AbsenceRepository absenceRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeController(EmployeRepository employeRepository,
                             AbsenceRepository absenceRepository,
                             PasswordEncoder passwordEncoder) {
        this.employeRepository = employeRepository;
        this.absenceRepository = absenceRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<Employe> getAllEmployes() {
        return employeRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createEmploye(@AuthenticationPrincipal Employe currentUser,
                                           @RequestBody Employe employe) {
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Seul l'administrateur peut ajouter un collaborateur."));
        }
        String rawPassword = (employe.getMotDePasse() != null && !employe.getMotDePasse().isBlank())
                ? employe.getMotDePasse()
                : "sprintpay123";
        employe.setMotDePasse(passwordEncoder.encode(rawPassword));
        if (employe.getRole() == null || employe.getRole().isBlank()) {
            employe.setRole("EMPLOYE");
        }
        return ResponseEntity.ok(employeRepository.save(employe));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEmploye(@AuthenticationPrincipal Employe currentUser,
                                           @PathVariable Long id,
                                           @RequestBody Employe details) {
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Seul l'administrateur peut modifier un collaborateur."));
        }
        return employeRepository.findById(id)
                .map(employe -> {
                    employe.setNom(details.getNom());
                    employe.setPrenom(details.getPrenom());
                    employe.setEmail(details.getEmail());
                    employe.setPoste(details.getPoste());
                    employe.setDepartement(details.getDepartement());
                    if (details.getRole() != null) {
                        employe.setRole(details.getRole());
                    }
                    return ResponseEntity.ok(employeRepository.save(employe));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEmploye(@AuthenticationPrincipal Employe currentUser,
                                           @PathVariable Long id) {
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Seul l'administrateur peut supprimer un collaborateur."));
        }
        if (!employeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        List<Absence> absences = absenceRepository.findByEmployeId(id);
        absenceRepository.deleteAll(absences);
        employeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
