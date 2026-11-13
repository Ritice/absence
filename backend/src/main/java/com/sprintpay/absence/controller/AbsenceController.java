package com.sprintpay.absence.controller;

import com.sprintpay.absence.model.Absence;
import com.sprintpay.absence.model.Employe;
import com.sprintpay.absence.repository.AbsenceRepository;
import com.sprintpay.absence.repository.EmployeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/absences")
@CrossOrigin(origins = "*")
public class AbsenceController {

    private final AbsenceRepository absenceRepository;
    private final EmployeRepository employeRepository;

    public AbsenceController(AbsenceRepository absenceRepository, EmployeRepository employeRepository) {
        this.absenceRepository = absenceRepository;
        this.employeRepository = employeRepository;
    }

    // Liste des absences
    @GetMapping
    public List<Absence> getAllAbsences() {
        return absenceRepository.findAllByOrderByDateDebutDesc();
    }

    // Historique des absences de l'utilisateur connecté
    @GetMapping("/me")
    public ResponseEntity<?> getMyAbsences(@AuthenticationPrincipal Employe currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(absenceRepository.findByEmployeIdOrderByDateDebutDesc(currentUser.getId()));
    }

    // Statistiques du nombre d'absences demandées : réservé uniquement à l'ADMIN
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@AuthenticationPrincipal Employe currentUser) {
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Seul l'administrateur peut voir le nombre d'absences demandées."));
        }
        List<Absence> toutes = absenceRepository.findAll();
        long total = toutes.size();
        long enAttente = toutes.stream().filter(a -> "EN_ATTENTE".equals(a.getStatut())).count();
        long approuvees = toutes.stream().filter(a -> "APPROUVEE".equals(a.getStatut())).count();
        long refusees = toutes.stream().filter(a -> "REFUSEE".equals(a.getStatut())).count();

        return ResponseEntity.ok(Map.of(
                "total", total,
                "enAttente", enAttente,
                "approuvees", approuvees,
                "refusees", refusees
        ));
    }

    // Demander une absence
    @PostMapping
    public ResponseEntity<?> createAbsence(@AuthenticationPrincipal Employe currentUser,
                                           @RequestBody Map<String, Object> payload) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Employe employeCible;
        if ("ADMIN".equalsIgnoreCase(currentUser.getRole()) && payload.get("employeId") != null && !payload.get("employeId").toString().isBlank()) {
            Long employeId = Long.valueOf(payload.get("employeId").toString());
            employeCible = employeRepository.findById(employeId).orElse(null);
        } else {
            // Un simple utilisateur ne peut demander une absence que pour lui-même
            employeCible = employeRepository.findById(currentUser.getId()).orElse(null);
        }

        if (employeCible == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Employé introuvable"));
        }

        Absence absence = new Absence();
        absence.setEmploye(employeCible);
        absence.setTypeAbsence((String) payload.get("typeAbsence"));
        absence.setDateDebut(LocalDate.parse((String) payload.get("dateDebut")));
        absence.setDateFin(LocalDate.parse((String) payload.get("dateFin")));
        absence.setMotif((String) payload.getOrDefault("motif", ""));
        absence.setStatut("EN_ATTENTE");
        absence.setDateCreation(LocalDate.now());

        return ResponseEntity.ok(absenceRepository.save(absence));
    }

    // Accepter ou refuser une absence : réservé uniquement à l'ADMIN
    @PatchMapping("/{id}/statut")
    public ResponseEntity<?> updateStatut(@AuthenticationPrincipal Employe currentUser,
                                          @PathVariable Long id,
                                          @RequestBody Map<String, String> body) {
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Accès refusé : seul l'administrateur peut accepter ou refuser une absence."));
        }

        String nouveauStatut = body.get("statut");
        return absenceRepository.findById(id)
                .map(absence -> {
                    absence.setStatut(nouveauStatut);
                    return ResponseEntity.ok(absenceRepository.save(absence));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Supprimer une absence (Admin uniquement)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAbsence(@AuthenticationPrincipal Employe currentUser,
                                           @PathVariable Long id) {
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Seul l'administrateur peut supprimer une absence."));
        }
        if (!absenceRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        absenceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
