package com.sprintpay.absence.config;

import com.sprintpay.absence.model.Absence;
import com.sprintpay.absence.model.Employe;
import com.sprintpay.absence.repository.AbsenceRepository;
import com.sprintpay.absence.repository.EmployeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class DataInitializer implements CommandLineRunner {

    private final EmployeRepository employeRepository;
    private final AbsenceRepository absenceRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(EmployeRepository employeRepository,
                           AbsenceRepository absenceRepository,
                           PasswordEncoder passwordEncoder) {
        this.employeRepository = employeRepository;
        this.absenceRepository = absenceRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (employeRepository.count() == 0) {
            Employe admin = employeRepository.save(new Employe(
                    "Mbarga", "Cédric", "admin@sprint-pay.com",
                    passwordEncoder.encode("admin"),
                    "Responsable RH", "Ressources Humaines", "ADMIN"
            ));
            Employe emp1 = employeRepository.save(new Employe(
                    "Ngono", "Samuel", "samuel.ngono@sprint-pay.com",
                    passwordEncoder.encode("samuel"),
                    "Ingénieur Backend", "Technologie", "EMPLOYE"
            ));
            Employe emp2 = employeRepository.save(new Employe(
                    "Kamga", "Amina", "amina.kamga@sprint-pay.com",
                    passwordEncoder.encode("amina"),
                    "Chef de Produit Paiement", "Produit", "EMPLOYE"
            ));

            absenceRepository.save(new Absence(
                    emp1, "CONGE_PAYE", LocalDate.now().plusDays(3), LocalDate.now().plusDays(10),
                    "Congé annuel programmé", "EN_ATTENTE"
            ));
            absenceRepository.save(new Absence(
                    emp2, "PERMISSION", LocalDate.now().minusDays(2), LocalDate.now().minusDays(1),
                    "Démarche administrative", "APPROUVEE"
            ));
            absenceRepository.save(new Absence(
                    admin, "MALADIE", LocalDate.now().minusDays(7), LocalDate.now().minusDays(5),
                    "Repos médical avec justificatif", "APPROUVEE"
            ));
        }
    }
}
