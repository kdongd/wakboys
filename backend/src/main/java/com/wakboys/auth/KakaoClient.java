package com.wakboys.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.wakboys.common.ApiException;
import com.wakboys.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
@RequiredArgsConstructor
public class KakaoClient {

    private final AppProperties props;
    private final RestClient rest = RestClient.create();

    /** Exchanges the authorization code and returns the Kakao user id (stable per Kakao account). */
    public long fetchKakaoId(String code, String redirectUri) {
        if (props.kakao().restApiKey() == null || props.kakao().restApiKey().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "카카오 로그인이 설정되지 않았어요");
        }
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "authorization_code");
            form.add("client_id", props.kakao().restApiKey());
            form.add("redirect_uri", redirectUri);
            form.add("code", code);
            if (props.kakao().clientSecret() != null && !props.kakao().clientSecret().isBlank()) {
                form.add("client_secret", props.kakao().clientSecret());
            }
            JsonNode token = rest.post()
                    .uri("https://kauth.kakao.com/oauth/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(JsonNode.class);
            String accessToken = token.get("access_token").asText();

            JsonNode me = rest.get()
                    .uri("https://kapi.kakao.com/v2/user/me")
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(JsonNode.class);
            return me.get("id").asLong();
        } catch (RestClientException | NullPointerException e) {
            log.warn("kakao login failed: {}", e.getMessage());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "카카오 로그인에 실패했어요. 다시 시도해주세요");
        }
    }
}
