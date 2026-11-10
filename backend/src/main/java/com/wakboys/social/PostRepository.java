package com.wakboys.social;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    long countByAuthorId(Long authorId);

    List<Post> findAllByOrderByIdDesc(Pageable pageable);

    List<Post> findByIdLessThanOrderByIdDesc(Long before, Pageable pageable);
}
