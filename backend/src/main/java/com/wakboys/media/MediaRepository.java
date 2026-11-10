package com.wakboys.media;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MediaRepository extends JpaRepository<Media, Long> {

    long countByTripId(Long tripId);

    long countByUploaderIdAndKind(Long uploaderId, String kind);

    List<Media> findByTripIdAndIdLessThanOrderByIdDesc(Long tripId, Long before, Pageable pageable);

    List<Media> findByTripIdOrderByIdDesc(Long tripId, Pageable pageable);

    List<Media> findByTripId(Long tripId);

    List<Media> findByPostIdInOrderByIdAsc(Collection<Long> postIds);

    List<Media> findByPostId(Long postId);

    Optional<Media> findFirstByTripIdAndIdGreaterThanOrderByIdAsc(Long tripId, Long id);

    Optional<Media> findFirstByTripIdAndIdLessThanOrderByIdDesc(Long tripId, Long id);
}
