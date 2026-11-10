package com.wakboys.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    long countByAuthorId(Long authorId);

    List<Comment> findByTargetTypeAndTargetIdOrderByIdAsc(String targetType, Long targetId);

    @Query("select c.targetId, count(c) from Comment c where c.targetType = :type and c.targetId in :ids group by c.targetId")
    List<Object[]> countGrouped(String type, Collection<Long> ids);

    @Modifying
    @Query("delete from Comment c where c.targetType = :type and c.targetId = :id")
    void deleteForTarget(String type, Long id);
}
