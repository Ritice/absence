package com.sprintpay.absence.repository;

import com.sprintpay.absence.model.Absence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AbsenceRepository extends JpaRepository<Absence, Long> {
    List<Absence> findAllByOrderByDateDebutDesc();
    List<Absence> findByEmployeId(Long employeId);
    List<Absence> findByEmployeIdOrderByDateDebutDesc(Long employeId);
}
