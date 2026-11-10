package com.wakboys.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Serves index.html for client-side routes so a refresh on /trips/3 still loads the app. */
@Controller
public class SpaController {

    @GetMapping({
            "/{a:^(?!api$|actuator$)[^.]*}",
            "/{a:^(?!api$|actuator$)[^.]*}/{b:[^.]*}",
            "/{a:^(?!api$|actuator$)[^.]*}/{b:[^.]*}/{c:[^.]*}",
            "/{a:^(?!api$|actuator$)[^.]*}/{b:[^.]*}/{c:[^.]*}/{d:[^.]*}"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
